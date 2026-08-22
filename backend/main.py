import os
import sys
import sqlite3
from fastapi import FastAPI, UploadFile

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "data", "component_6"))
sys.path.append(os.path.dirname(__file__))
from conservation_flag import flag_species
from pipeline_output import build_detection

app = FastAPI(title="AquaVigil API", version="0.2.0")
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


# Demo detections for the current test sample, computed from real
# VSEARCH + Kraken2 output during Phase 2 testing. Replace this list
# once samples are processed live end-to-end instead of pre-computed.
DEMO_DETECTIONS_INPUT = [
    {
        "marker_gene": "12S",
        "vsearch_species": "Rhincodon typus",
        "kraken_species": "Rhincodon typus",
        "vsearch_identity": 98.0,
        "read_count": 340,
    },
    {
        "marker_gene": "12S",
        "vsearch_species": "Sardinella longiceps",
        "kraken_species": "Sardinella longiceps",
        "vsearch_identity": 99.0,
        "read_count": 512,
    },
    {
        "marker_gene": "12S",
        "vsearch_species": "Plestiodon chinensis",
        "kraken_species": "Plestiodon chinensis",
        "vsearch_identity": 88.0,
        "read_count": 27,
    },
]


@app.get("/samples/{sample_id}/results")
async def get_results(sample_id: int):
    """Species list + confidence + conservation flags for a sample.
    Now uses real router + confidence + conservation logic instead of stub data."""
    detections = []
    for row in DEMO_DETECTIONS_INPUT:
        result = build_detection(
            marker_gene=row["marker_gene"],
            vsearch_species=row["vsearch_species"],
            kraken_species=row["kraken_species"],
            vsearch_identity=row["vsearch_identity"],
        )
        detections.append({
            "species": result["species_name"],
            "read_count": row["read_count"],
            "confidence": result["confidence_score"],
            "conservation_flag": (
                result["conservation"]["flag_reason"]
                if result["conservation"]["is_flagged"] else None
            ),
        })

    return {
        "sample_id": sample_id,
        "detections": detections,
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
    """IUCN + Wildlife Act status for a species. Now uses Aarav's real lookup."""
    flag_result = flag_species(species_name)
    return {
        "species": flag_result["scientific_name"],
        "found_in_cache": flag_result["found_in_cache"],
        "iucn_status": flag_result["iucn_category"] or "unknown",
        "wildlife_act_schedule": flag_result["wpa_schedule"] or "unknown",
        "is_flagged": flag_result["is_flagged"],
        "flag_reason": flag_result["flag_reason"],
    }