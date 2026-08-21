"""
AquaVigil backend — Phase 1 stub API.

This matches the API contract from the architecture doc exactly, so Leena's
frontend and everyone else can build against these real routes/response
shapes today, even though the actual logic behind each one isn't wired up
yet. Every response includes a "note" field flagging it as a stub so nobody
mistakes placeholder data for something real later.
"""

import os
import sqlite3

from fastapi import FastAPI, UploadFile

app = FastAPI(title="AquaVigil API", version="0.1.0-stub")

DB_PATH = os.path.join(os.path.dirname(__file__), "aquavigil.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@app.on_event("startup")
def init_db():
    conn = get_db()
    with open(SCHEMA_PATH) as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()


@app.post("/samples/upload")
async def upload_sample(file: UploadFile):
    """Accepts a raw reads file, creates a sample record.
    STUB: file isn't actually processed yet — just confirms the contract."""
    return {
        "sample_id": 1,
        "status": "uploaded",
        "note": "stub — real ingestion not wired yet",
    }


@app.post("/samples/{sample_id}/classify")
async def classify_sample(sample_id: int):
    """Will trigger the Classification Engine (Sunanda's ensemble +
    Darshan/Aarya's model). STUB for now."""
    return {
        "sample_id": sample_id,
        "status": "classifying",
        "note": "stub — classification engine not wired yet",
    }


@app.get("/samples/{sample_id}/results")
async def get_results(sample_id: int):
    """Species list + confidence + conservation flags for a sample.
    STUB data, but in the exact shape the real response will use."""
    return {
        "sample_id": sample_id,
        "detections": [
            {
                "species": "Example species A",
                "read_count": 340,
                "confidence": 0.91,
                "conservation_flag": None,
            },
            {
                "species": "Example species B",
                "read_count": 12,
                "confidence": 0.42,
                "conservation_flag": "endangered",
            },
        ],
        "note": "stub — replace once the confidence layer is wired in",
    }


@app.get("/samples/{sample_id}/indices")
async def get_indices(sample_id: int):
    """Biodiversity indices for a sample. STUB numbers."""
    return {
        "sample_id": sample_id,
        "richness": 2,
        "shannon_index": 0.61,
        "evenness": 0.88,
        "note": "stub — Sunanda's indices engine not wired yet",
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
    """IUCN + Wildlife Act status for a species. STUB values."""
    return {
        "species": species_name,
        "iucn_status": "unknown",
        "wildlife_act_schedule": "unknown",
        "note": "stub — Aarav's lookup table not wired in yet",
    }