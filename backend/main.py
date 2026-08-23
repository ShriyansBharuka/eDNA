import os
import sys
import sqlite3
from collections import Counter, defaultdict

from fastapi import Depends, FastAPI, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "data", "component_6"))
sys.path.append(os.path.dirname(__file__))
from conservation_flag import flag_species
from biodiversity_indices import calculate_all_indices
from classifier import classify_reads
from reads_io import parse_reads
from similarity import get_similarity
from auth import create_user, authenticate_user, create_token, get_current_user

app = FastAPI(title="AquaVigil API", version="0.5.0")

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

# In-memory per-sample store. Each sample now tracks which user_id owns it,
# so /samples/mine can return a user's own past searches after login.
# Id 1 is reserved for the seeded demo sample and has no owner (user_id=None) —
# it's shown to everyone regardless of login, since it's not anyone's real data.
SAMPLES: dict[int, dict] = {}
_next_sample_id = 2


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _classify_and_aggregate(sequences: list[str]):
    sample_reads = sequences[:MAX_READS_PER_CLASSIFY]
    classified = classify_reads(sample_reads)

    counts: Counter = Counter()
    confidence_totals: dict = defaultdict(float)
    for c in classified:
        counts[c["species"]] += 1
        confidence_totals[c["species"]] += c["confidence"]

    detections = []
    for species, read_count in counts.most_common():
        flag_result = flag_species(species)
        detections.append({
            "species": species,
            "read_count": read_count,
            "confidence": round(confidence_totals[species] / read_count, 3),
            "conservation_flag": flag_result["flag_reason"] if flag_result["is_flagged"] else None,
        })

    indices = calculate_all_indices(dict(counts))
    return detections, indices, len(sample_reads)


@app.on_event("startup")
def init_db():
    conn = get_db()
    with open(SCHEMA_PATH) as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()


@app.on_event("startup")
def seed_demo_sample():
    try:
        with open(SEED_FASTQ_PATH, "rb") as f:
            content = f.read()
        all_sequences = parse_reads(SEED_FASTQ_PATH, content)
        window = 15
        num_windows = max(1, SEED_READ_COUNT // window)
        span = len(all_sequences) // num_windows
        sequences = []
        for i in range(num_windows):
            start = i * span
            sequences.extend(all_sequences[start:start + window])
    except (FileNotFoundError, ValueError):
        SAMPLES[1] = {
            "user_id": None, "sequences": [], "marker_gene": "COI", "status": "uploaded",
            "detections": [], "indices": {"richness": 0, "shannon_index": 0.0, "evenness": 0.0},
            "reads_used": 0,
        }
        return

    detections, indices, reads_used = _classify_and_aggregate(sequences)
    SAMPLES[1] = {
        "user_id": None,
        "sequences": sequences,
        "marker_gene": "12S",
        "status": "done",
        "detections": detections,
        "indices": indices,
        "reads_used": reads_used,
    }


# ---------- Auth routes ----------
from pydantic import BaseModel, EmailStr


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


# ---------- Sample routes (require login, tied to the logged-in user) ----------

@app.post("/samples/upload")
async def upload_sample(
    file: UploadFile,
    marker_gene: str = Form("COI"),
    current_user: dict = Depends(get_current_user),
):
    global _next_sample_id
    content = await file.read()
    try:
        sequences = parse_reads(file.filename or "upload", content)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    sample_id = _next_sample_id
    _next_sample_id += 1
    SAMPLES[sample_id] = {
        "user_id": current_user["user_id"],
        "sequences": sequences,
        "marker_gene": marker_gene,
        "status": "uploaded",
        "detections": None,
        "indices": None,
        "reads_used": 0,
    }

    return {
        "sample_id": sample_id,
        "status": "uploaded",
        "note": f"parsed {len(sequences)} reads from '{file.filename}'",
    }


@app.post("/samples/{sample_id}/classify")
async def classify_sample(sample_id: int, current_user: dict = Depends(get_current_user)):
    sample = SAMPLES.get(sample_id)
    if sample is None:
        raise HTTPException(status_code=404, detail="Unknown sample_id — upload a sample first")
    if sample["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="This sample belongs to a different user")

    detections, indices, reads_used = _classify_and_aggregate(sample["sequences"])
    sample["detections"] = detections
    sample["indices"] = indices
    sample["reads_used"] = reads_used
    sample["status"] = "done"

    return {"sample_id": sample_id, "status": "done"}


@app.get("/samples/mine")
async def get_my_samples(current_user: dict = Depends(get_current_user)):
    """Returns this user's past samples (id, marker gene, status) so the
    frontend can show their search history after login."""
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
async def get_results(sample_id: int, current_user: dict = Depends(get_current_user)):
    sample = SAMPLES.get(sample_id)
    if sample is None or sample["detections"] is None:
        raise HTTPException(status_code=404, detail="Sample not found or not classified yet")
    if sample["user_id"] is not None and sample["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="This sample belongs to a different user")

    return {
        "sample_id": sample_id,
        "detections": sample["detections"],
        "note": f"classified {sample['reads_used']} reads via the 5-mer TF-IDF + logistic regression baseline",
    }


@app.get("/samples/{sample_id}/indices")
async def get_indices(sample_id: int, current_user: dict = Depends(get_current_user)):
    sample = SAMPLES.get(sample_id)
    if sample is None or sample["indices"] is None:
        raise HTTPException(status_code=404, detail="Sample not found or not classified yet")
    if sample["user_id"] is not None and sample["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="This sample belongs to a different user")

    return {
        "sample_id": sample_id,
        **sample["indices"],
        "note": f"computed from {sample['reads_used']} classified reads",
    }


# ---------- Species lookup routes (open, not tied to any user) ----------

@app.get("/species/{species_name}/distribution")
async def get_distribution(species_name: str):
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
    result = get_similarity(species_name)
    if result is None:
        raise HTTPException(status_code=404, detail=f"'{species_name}' not found in the similarity map")
    return result