"""
Conservation Flagging module for AquaVigil.

Reads the pre-cached species_cache.json (built from manual IUCN + CITES/WPA
research) and returns a flag object for any detected species. No live API
calls happen here by design - the demo must not depend on network access
to IUCN or GBIF during judging.

Hand this file to Sunanda to wire into the /samples/{id}/results endpoint,
or call flag_species() directly wherever the detection pipeline emits results.
"""

import json
from pathlib import Path

CACHE_PATH = Path(__file__).parent / "species_cache.json"

FLAG_TRIGGER_CATEGORIES = {"CR", "EN", "VU"}


def _load_cache():
    with open(CACHE_PATH, "r") as f:
        data = json.load(f)
    # index by lowercase scientific name for forgiving lookups
    return {entry["scientific_name"].lower(): entry for entry in data["species"]}


_SPECIES_INDEX = _load_cache()


def flag_species(scientific_name: str) -> dict:
    """
    Look up a detected species and return its conservation flag status.

    Returns a dict shaped for direct use in the dashboard / detections table:
    {
        "scientific_name": str,
        "found_in_cache": bool,
        "iucn_category": str | None,
        "cites_appendix": str | None,
        "wpa_schedule": str | None,
        "is_flagged": bool,
        "flag_reason": str | None
    }
    """
    key = scientific_name.strip().lower()
    entry = _SPECIES_INDEX.get(key)

    if entry is None:
        return {
            "scientific_name": scientific_name,
            "found_in_cache": False,
            "iucn_category": None,
            "cites_appendix": None,
            "wpa_schedule": None,
            "is_flagged": False,
            "flag_reason": "Species not in cached lookup table",
        }

    reasons = []
    if entry["iucn_category"] in FLAG_TRIGGER_CATEGORIES:
        reasons.append(f"IUCN {entry['iucn_category']}")
    if entry["wpa_schedule"] in ("I", "II"):
        reasons.append(f"WPA Schedule {entry['wpa_schedule']}")
    if entry["cites_appendix"] == "I":
        reasons.append("CITES Appendix I")

    return {
        "scientific_name": entry["scientific_name"],
        "common_name": entry["common_name"],
        "found_in_cache": True,
        "iucn_category": entry["iucn_category"],
        "cites_appendix": entry["cites_appendix"],
        "wpa_schedule": entry["wpa_schedule"],
        "is_flagged": len(reasons) > 0,
        "flag_reason": ", ".join(reasons) if reasons else None,
    }


def flag_batch(scientific_names: list[str]) -> list[dict]:
    """Convenience wrapper for flagging every species in a sample's detection list."""
    return [flag_species(name) for name in scientific_names]


if __name__ == "__main__":
    # quick smoke test
    test_species = [
        "Sphyrna lewini",
        "Sardinella longiceps",
        "Some Unknown Species",
    ]
    for result in flag_batch(test_species):
        print(result)
