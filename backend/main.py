import os
import secrets
import sys
import sqlite3
from collections import Counter, defaultdict
from urllib.parse import quote

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr

# Loads backend/.env if present (GITHUB_CLIENT_ID etc.) — a no-op if it
# doesn't exist, so this is safe in prod where real env vars are set
# directly (Render) instead of via a committed/local .env file.
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "data", "component_6"))
sys.path.append(os.path.dirname(__file__))
# These have to come after the sys.path.append() calls above — conservation_flag
# lives outside the normal import path and won't resolve otherwise — so linters
# flag them as "E402: module level import not at top of file". That's a real
# ordering requirement here, not a mistake; noqa silences the false positive.
from conservation_flag import flag_species  # noqa: E402
from biodiversity_indices import calculate_all_indices  # noqa: E402
from classifier import classify_reads  # noqa: E402
from reads_io import parse_reads  # noqa: E402
from similarity import get_similarity  # noqa: E402
from embedding import live_similarity  # noqa: E402
from auth import (  # noqa: E402
    create_user, authenticate_user, create_token, get_current_user, get_optional_user,
    github_oauth_configured, build_github_authorize_url, exchange_github_code,
    fetch_github_profile, find_or_create_github_user, get_user_by_id, FRONTEND_URL,
)

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

    # CREATE TABLE IF NOT EXISTS above only applies to a fresh database — an
    # aquavigil.db from before GitHub login won't retroactively pick up
    # these columns, so add them by hand. SQLite has no "ADD COLUMN IF NOT
    # EXISTS", so this just ignores "duplicate column" on every run after
    # the first; that's the standard pragmatic migration pattern for SQLite.
    for statement in (
        "ALTER TABLE users ADD COLUMN github_id INTEGER UNIQUE",
        "ALTER TABLE users ADD COLUMN github_username TEXT",
        "ALTER TABLE users ADD COLUMN avatar_url TEXT",
    ):
        try:
            conn.execute(statement)
        except sqlite3.OperationalError as e:
            if "duplicate column" not in str(e).lower():
                raise

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


# In-memory CSRF state store for the GitHub OAuth handshake — a set of
# one-time-use tokens minted by /auth/github/login and consumed by the
# callback below. In-memory is fine here for the same reason SAMPLES is:
# this backend already has no durable session state across restarts.
_oauth_states: set[str] = set()


@app.get("/auth/github/login")
async def github_login():
    """Redirects the browser to GitHub's own authorize page. The frontend
    triggers this with a full-page navigation (not fetch) since the whole
    point is to leave the app and come back."""
    if not github_oauth_configured():
        raise HTTPException(
            status_code=500,
            detail="GitHub login isn't configured — set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET "
            "(see backend/auth.py for the full env var list and what to register on GitHub).",
        )
    state = secrets.token_urlsafe(24)
    _oauth_states.add(state)
    return RedirectResponse(build_github_authorize_url(state))


@app.get("/auth/github/callback")
async def github_callback(code: str, state: str):
    """GitHub redirects here after the user approves (or denies) access.
    Either way this ends in a redirect back to the frontend — errors go out
    as an `auth_error` query param rather than an API-style error response,
    since there's no frontend JS listening for a fetch response at this
    point, only the browser's own navigation."""
    if state not in _oauth_states:
        return RedirectResponse(f"{FRONTEND_URL}/?auth_error={quote('Login expired or was tampered with — try again')}")
    _oauth_states.discard(state)

    try:
        access_token = exchange_github_code(code)
        profile = fetch_github_profile(access_token)
        user = find_or_create_github_user(profile)
    except Exception as e:  # noqa: BLE001 — surfaced to the user either way, catch-all is intentional here
        return RedirectResponse(f"{FRONTEND_URL}/?auth_error={quote(str(e))}")

    token = create_token(user["id"], user["email"])
    return RedirectResponse(f"{FRONTEND_URL}/?auth_token={token}")


@app.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Full current profile (username, avatar) for a logged-in session —
    the JWT payload itself only carries user_id/email, so the frontend
    calls this once after picking up a token to actually render who's
    logged in."""
    user = get_user_by_id(current_user["user_id"])
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


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