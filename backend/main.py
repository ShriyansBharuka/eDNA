import os
import sys
import sqlite3
from collections import Counter, defaultdict

from fastapi import FastAPI, Form, HTTPException, UploadFile

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "data", "component_6"))
sys.path.append(os.path.dirname(__file__))
from conservation_flag import flag_species
from biodiversity_indices import calculate_all_indices
from classifier import classify_reads
from reads_io import parse_reads

app = FastAPI(title="AquaVigil API", version="0.3.0")
DB_PATH = os.path.join(os.path.dirname(__file__), "aquavigil.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")
SEED_FASTQ_PATH = os.path.join(os.path.dirname(__file__), "..", "simulated_data", "simulated_reads.fastq")

# A real upload can carry ~200k reads; classifying all of them synchronously
# would take minutes. Capping keeps a request under ~2s while staying a
# statistically meaningful sample of the file.
MAX_READS_PER_CLASSIFY = 2000
SEED_READ_COUNT = 100

# In-memory per-sample store — a single-process demo server with no auth, so
# this is deliberately not SQLite: the existing `detections` table schema was
# built for the multi-classifier-source ensemble scenario, which doesn't fit
# a single real classifier's output cleanly. Id 1 is reserved for the seeded
# demo sample (see seed_demo_sample below); real uploads start at 2.
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
    """Populate sample id 1 with real classifier output (not hardcoded
    placeholder species) so the dashboard isn't empty on first page load,
    before anyone has uploaded anything — same pipeline a real upload uses."""
    try:
        with open(SEED_FASTQ_PATH, "rb") as f:
            content = f.read()
        all_sequences = parse_reads(SEED_FASTQ_PATH, content)
        # The file is grouped by species (sequential runs of the same
        # species — reads/species is large enough that a run is always
        # longer than one window here), so a handful of consecutive-read
        # windows spread across the file gives real, varied per-species
        # read counts instead of either one species (first N reads) or
        # every species landing at exactly 1 read (a full stride).
        window = 15
        num_windows = max(1, SEED_READ_COUNT // window)
        span = len(all_sequences) // num_windows
        sequences = []
        for i in range(num_windows):
            start = i * span
            sequences.extend(all_sequences[start:start + window])
    except (FileNotFoundError, ValueError):
        SAMPLES[1] = {
            "sequences": [], "marker_gene": "COI", "status": "uploaded",
            "detections": [], "indices": {"richness": 0, "shannon_index": 0.0, "evenness": 0.0},
            "reads_used": 0,
        }
        return

    detections, indices, reads_used = _classify_and_aggregate(sequences)
    SAMPLES[1] = {
        "sequences": sequences,
        "marker_gene": "12S",
        "status": "done",
        "detections": detections,
        "indices": indices,
        "reads_used": reads_used,
    }


@app.post("/samples/upload")
async def upload_sample(file: UploadFile, marker_gene: str = Form("COI")):
    """Parses the uploaded reads file and stores it under a new sample id.
    Classification happens in the separate /classify step below."""
    global _next_sample_id
    content = await file.read()
    try:
        sequences = parse_reads(file.filename or "upload", content)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    sample_id = _next_sample_id
    _next_sample_id += 1
    SAMPLES[sample_id] = {
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
async def classify_sample(sample_id: int):
    sample = SAMPLES.get(sample_id)
    if sample is None:
        raise HTTPException(status_code=404, detail="Unknown sample_id — upload a sample first")

    detections, indices, reads_used = _classify_and_aggregate(sample["sequences"])
    sample["detections"] = detections
    sample["indices"] = indices
    sample["reads_used"] = reads_used
    sample["status"] = "done"

    return {"sample_id": sample_id, "status": "done"}


@app.get("/samples/{sample_id}/results")
async def get_results(sample_id: int):
    """Species list + confidence + conservation flags for a sample — real
    classifier output (backend/classifier.py), aggregated per species."""
    sample = SAMPLES.get(sample_id)
    if sample is None or sample["detections"] is None:
        raise HTTPException(status_code=404, detail="Sample not found or not classified yet")

    return {
        "sample_id": sample_id,
        "detections": sample["detections"],
        "note": f"classified {sample['reads_used']} reads via the 5-mer TF-IDF + logistic regression baseline",
    }


@app.get("/samples/{sample_id}/indices")
async def get_indices(sample_id: int):
    """Biodiversity indices for a sample, computed from real per-species
    read counts (backend/biodiversity_indices.py)."""
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
    """GBIF occurrence points for the Species Explorer map. STUB points —
    no GBIF integration wired in yet."""
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
    """IUCN + Wildlife Act status for a species — real lookup against
    data/component_6/species_cache.json."""
    flag_result = flag_species(species_name)
    return {
        "species": flag_result["scientific_name"],
        "found_in_cache": flag_result["found_in_cache"],
        "iucn_status": flag_result["iucn_category"] or "unknown",
        "wildlife_act_schedule": flag_result["wpa_schedule"] or "unknown",
        "is_flagged": flag_result["is_flagged"],
        "flag_reason": flag_result["flag_reason"],
    }
