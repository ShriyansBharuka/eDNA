import os
import sys
import sqlite3
from collections import Counter, defaultdict

from fastapi import Depends, FastAPI, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "data", "component_6"))
sys.path.append(os.path.dirname(__file__))
from conservation_flag import flag_species
from biodiversity_indices import calculate_all_indices
from classifier import classify_reads
from reads_io import parse_reads
from similarity import get_similarity
from embedding import live_similarity
from auth import create_user, authenticate_user, create_token, get_current_user, get_optional_user

app = FastAPI(title="AquaVigil API", version="0.6.0")

# Hosted frontend (Vercel) and backend (Render) live on different origins.
# No cookies/session credentials are used anywhere in this API, so a fully
# open CORS policy is the safe, standard choice here — it also means preview
# deploy URLs (which change per-branch on Vercel) work with no extra config.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
DB_PATH = os.path.join(os.path.dirname(__file__), "aquavigil.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")
SEED_FASTQ_PATH = os.path.join(os.path.dirname(__file__), "..", "simulated_data", "simulated_reads.fastq")

MAX_READS_PER_CLASSIFY = 2000
SEED_READ_COUNT = 100

# The classifier always returns a top guess for every read — softmax has no
# built-in "I don't know". Reads below this confidence are pulled out of the
# normal species detections (and out of the biodiversity indices, which are
# computed from confident calls only) and shown in the Discovered panel
# instead of being force-assigned a species nobody actually believes.
UNMATCHED_CONFIDENCE_THRESHOLD = 0.5

SAMPLES: dict[int, dict] = {}
_next_sample_id = 2


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _classify_and_aggregate(sequences: list[str]):
    """Shared by real uploads and the startup seed — one code path for both,
    so 'seeded' and 'real' data are never two things that can drift apart."""
    sample_reads = sequences[:MAX_READS_PER_CLASSIFY]
    classified = classify_reads(sample_reads)

    counts: Counter = Counter()
    confidence_totals: dict = defaultdict(float)
    # Which raw read sequences landed in each species — kept so the live
    # embedding endpoint can embed THIS sample's own reads for a species,
    # not just look the species name up in the precomputed reference graph.
    reads_by_species: dict = defaultdict(list)

    # Reads whose top-call confidence didn't clear the threshold — grouped
    # by their (rejected) nearest guess, for the Discovered panel. Kept out
    # of counts/reads_by_species entirely, so they don't inflate the
    # biodiversity indices or the similarity map with low-confidence calls.
    unmatched_counts: Counter = Counter()
    unmatched_confidence_totals: dict = defaultdict(float)

    for seq, c in zip(sample_reads, classified):
        if c["confidence"] >= UNMATCHED_CONFIDENCE_THRESHOLD:
            counts[c["species"]] += 1
            confidence_totals[c["species"]] += c["confidence"]
            reads_by_species[c["species"]].append(seq)
        else:
            unmatched_counts[c["species"]] += 1
            unmatched_confidence_totals[c["species"]] += c["confidence"]

    detections = []
    for species, read_count in counts.most_common():
        flag_result = flag_species(species)
        detections.append({
            "species": species,
            "read_count": read_count,
            "confidence": round(confidence_totals[species] / read_count, 3),
            "conservation_flag": flag_result["flag_reason"] if flag_result["is_flagged"] else None,
        })

    unmatched = []
    for species, read_count in unmatched_counts.most_common():
        unmatched.append({
            "nearest_species": species,
            "nearest_identity": round(unmatched_confidence_totals[species] / read_count, 3),
            "read_count": read_count,
        })

    indices = calculate_all_indices(dict(counts))
    return detections, indices, len(sample_reads), dict(reads_by_species), unmatched


@app.on_event("startup")
def init_db():
    conn = get_db()
    with open(SCHEMA_PATH) as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()


@app.on_event("startup")
def seed_demo_sample():
    """Populate sample id 1 with real classifier output so the dashboard
    isn't empty on first page load. Owned by no one (user_id=None), so
    every visitor sees it regardless of login state."""
    try:
        with open(SEED_FASTQ_PATH, "rb") as f:
            all_sequences = parse_reads(SEED_FASTQ_PATH, f)
        window = 15
        num_windows = max(1, SEED_READ_COUNT // window)
        span = len(all_sequences) // num_windows
        sequences = []
        for i in range(num_windows):
            start = i * span
            sequences.extend(all_sequences[start:start + window])
    except (FileNotFoundError, ValueError):
        SAMPLES[1] = {
            "user_id": None,
            "sequences": [], "marker_gene": "COI", "status": "uploaded",
            "detections": [], "indices": {"richness": 0, "shannon_index": 0.0, "evenness": 0.0},
            "reads_used": 0, "reads_by_species": {}, "unmatched": [],
        }
        return

    detections, indices, reads_used, reads_by_species, unmatched = _classify_and_aggregate(sequences)
    SAMPLES[1] = {
        "user_id": None,
        "sequences": sequences,
        "marker_gene": "12S",
        "status": "done",
        "detections": detections,
        "indices": indices,
        "reads_used": reads_used,
        "reads_by_species": reads_by_species,
        "unmatched": unmatched,
    }


class SignupRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@app.post("/auth/signup")
async def signup(payload: SignupRequest):
    if len(payload.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
    try:
        user = create_user(payload.email, payload.password)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    token = create_token(user["id"], user["email"])
    return {"user": user, "token": token}


@app.post("/auth/login")
async def login(payload: LoginRequest):
    user = authenticate_user(payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["id"], user["email"])
    return {"user": user, "token": token}


@app.post("/samples/upload")
async def upload_sample(
    file: UploadFile,
    marker_gene: str = Form("COI"),
    current_user: dict | None = Depends(get_optional_user),
):
    """Parses the uploaded reads file and stores it under a new sample id."""
    global _next_sample_id
    # Reading straight from file.file (streamed from disk/network as the
    # request came in) instead of `await file.read()` — that would pull the
    # ENTIRE upload into one Python bytes object before parsing even starts,
    # which alone was enough to OOM-kill the whole Render instance on a
    # 135MB real file.
    try:
        sequences = parse_reads(file.filename or "upload", file.file, max_sequences=MAX_READS_PER_CLASSIFY)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    sample_id = _next_sample_id
    _next_sample_id += 1
    SAMPLES[sample_id] = {
        "user_id": current_user["user_id"] if current_user else None,
        "sequences": sequences,
        "marker_gene": marker_gene,
        "status": "uploaded",
        "detections": None,
        "indices": None,
        "reads_used": 0,
        "reads_by_species": {},
        "unmatched": [],
    }

    return {
        "sample_id": sample_id,
        "status": "uploaded",
        "note": f"parsed {len(sequences)} reads from '{file.filename}'",
    }


@app.post("/samples/{sample_id}/classify")
async def classify_sample(sample_id: int):
    sample = SAMPLES.get(sample_id)
    if sample is None:
        raise HTTPException(status_code=404, detail="Unknown sample_id — upload a sample first")

    detections, indices, reads_used, reads_by_species, unmatched = _classify_and_aggregate(sample["sequences"])
    sample["detections"] = detections
    sample["indices"] = indices
    sample["reads_used"] = reads_used
    sample["reads_by_species"] = reads_by_species
    sample["unmatched"] = unmatched
    sample["status"] = "done"

    return {"sample_id": sample_id, "status": "done"}


@app.get("/samples/mine")
async def get_my_samples(current_user: dict = Depends(get_current_user)):
    """Returns this user's past samples — requires login."""
    mine = [
        {
            "sample_id": sid,
            "marker_gene": s["marker_gene"],
            "status": s["status"],
            "reads_used": s["reads_used"],
        }
        for sid, s in SAMPLES.items()
        if s["user_id"] == current_user["user_id"]
    ]
    return {"samples": mine}


@app.get("/samples/{sample_id}/results")
async def get_results(sample_id: int):
    """Species list + confidence + conservation flags for a sample."""
    sample = SAMPLES.get(sample_id)
    if sample is None or sample["detections"] is None:
        raise HTTPException(status_code=404, detail="Sample not found or not classified yet")

    return {
        "sample_id": sample_id,
        "detections": sample["detections"],
        "note": f"classified {sample['reads_used']} reads via the 5-mer TF-IDF + logistic regression baseline",
    }


@app.get("/samples/{sample_id}/discovered")
async def get_discovered(sample_id: int):
    """
    Reads whose top classifier confidence fell below
    UNMATCHED_CONFIDENCE_THRESHOLD — real low-confidence calls that were
    kept OUT of the normal species detections and indices, grouped by
    their nearest (rejected) guess, for the Discovered panel.
    """
    sample = SAMPLES.get(sample_id)
    if sample is None or sample["detections"] is None:
        raise HTTPException(status_code=404, detail="Sample not found or not classified yet")

    return {
        "sample_id": sample_id,
        "marker_gene": sample["marker_gene"],
        "confidence_threshold": UNMATCHED_CONFIDENCE_THRESHOLD,
        "unmatched": sample.get("unmatched", []),
        "note": f"reads with top-call confidence below {UNMATCHED_CONFIDENCE_THRESHOLD:.0%} are shown here instead of being force-assigned a species",
    }


@app.get("/samples/{sample_id}/reads")
async def get_sample_reads(sample_id: int):
    """
    Real raw reads for this sample, grouped by the species each was
    classified as. Used so the frontend can show/export a genuine
    sequenced read as a species' "eDNA barcode sequence" instead of a
    fabricated one (previously generated by hashing the species name).
    """
    sample = SAMPLES.get(sample_id)
    if sample is None or sample["detections"] is None:
        raise HTTPException(status_code=404, detail="Sample not found or not classified yet")

    return {"sample_id": sample_id, "reads_by_species": sample.get("reads_by_species", {})}


@app.get("/samples/{sample_id}/indices")
async def get_indices(sample_id: int):
    """Biodiversity indices for a sample."""
    sample = SAMPLES.get(sample_id)
    if sample is None or sample["indices"] is None:
        raise HTTPException(status_code=404, detail="Sample not found or not classified yet")

    return {
        "sample_id": sample_id,
        **sample["indices"],
        "note": f"computed from {sample['reads_used']} classified reads",
    }


@app.get("/species/{species_name}/distribution")
async def get_distribution(species_name: str):
    """GBIF occurrence points for the Species Explorer map. STUB points."""
    return {
        "species": species_name,
        "occurrence_points": [
            {"lat": -32.0, "lon": 115.7},
            {"lat": -31.8, "lon": 115.6},
        ],
        "note": "stub — real GBIF integration not wired yet",
    }


@app.get("/species/{species_name}/conservation-status")
async def get_conservation_status(species_name: str):
    """IUCN + Wildlife Act status for a species."""
    flag_result = flag_species(species_name)
    return {
        "species": flag_result["scientific_name"],
        "found_in_cache": flag_result["found_in_cache"],
        "iucn_status": flag_result["iucn_category"] or "unknown",
        "wildlife_act_schedule": flag_result["wpa_schedule"] or "unknown",
        "is_flagged": flag_result["is_flagged"],
        "flag_reason": flag_result["flag_reason"],
    }


@app.get("/species/{species_name}/similarity")
async def get_species_similarity(species_name: str):
    """Genetic similarity map (component 7) — precomputed reference graph, looked up by name."""
    result = get_similarity(species_name)
    if result is None:
        raise HTTPException(status_code=404, detail=f"'{species_name}' not found in the similarity map")
    return result


@app.get("/samples/{sample_id}/species/{species_name}/similarity")
async def get_sample_species_similarity(sample_id: int, species_name: str):
    """
    Live genetic similarity (component 7) — embeds THIS sample's own reads
    classified as species_name through the trained embedding model, then
    compares that real embedding against every species' reference centroid.
    Unlike /species/{name}/similarity above, this reflects the actual
    sequence data in this sample, not just the species name.
    """
    sample = SAMPLES.get(sample_id)
    if sample is None or sample["detections"] is None:
        raise HTTPException(status_code=404, detail="Sample not found or not classified yet")

    reads = sample.get("reads_by_species", {}).get(species_name)
    if not reads:
        raise HTTPException(status_code=404, detail=f"No classified reads for '{species_name}' in sample {sample_id}")

    result = live_similarity(species_name, reads)
    return {"sample_id": sample_id, **result}