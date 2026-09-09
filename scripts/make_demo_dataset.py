#!/usr/bin/env python3
"""
ANVESH — builds a small, presentation-ready demo FASTQ for live pitches.

Problem this solves: the live classifier is a closed-set model over exactly
500 species (see models/transformer/checkpoints/label_mapping.json), and the
conservation cache (data/component_6/species_cache.json) only has 18 species
in it. Cross-referencing those two lists, only ONE species used to be in
both — meaning a random real upload almost never actually triggers the
Endangered Species panel, even though the flagging logic itself is real.

This script does NOT fabricate anything: every read here is a REAL training
read (from simulated_data/simulated_reads.fastq, pulled by species using
simulated_data/manifest.csv's ground truth), for species that are REALLY in
the classifier's 500-species vocabulary. What makes this a "demo" dataset is
just curation — it deliberately picks a handful of species now covered by
species_cache.json (see the additions made alongside this script) so the
resulting sample is guaranteed to produce real Endangered Species flags,
mixed with a few ordinary unflagged species for contrast.

Usage:
    python scripts/make_demo_dataset.py

Output:
    simulated_data/endangered_demo.fastq
"""

import csv
import os

READS_PER_SPECIES = 15

# Real IUCN-threatened species that are BOTH in the classifier's 500-species
# vocabulary AND in species_cache.json — see that file for category/sourcing
# per species. Carcharhinus longimanus was already there and verified; the
# other three were added specifically to make this demo dataset possible
# (see the "verify before presenting" note on those entries).
ENDANGERED_SPECIES = [
    "Carcharhinus longimanus",  # Oceanic whitetip shark — IUCN CR
    "Somniosus microcephalus",  # Greenland shark — IUCN VU
    "Hippocampus whitei",       # White's seahorse — IUCN EN
    "Urogymnus asperrimus",     # Porcupine ray — IUCN VU
]

# Ordinary (unflagged) species for contrast, so the demo shows a realistic
# mixed sample rather than "everything is endangered".
CONTROL_SPECIES = [
    "Amphiprion akindynos",     # Barrier Reef anemonefish
    "Acanthurus nigricauda",    # Epaulette surgeonfish
    "Anguilla reinhardtii",     # Long-finned eel
    "Apogon imberbis",          # Cardinalfish
]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "simulated_data")
MANIFEST_PATH = os.path.join(DATA_DIR, "manifest.csv")
READS_PATH = os.path.join(DATA_DIR, "simulated_reads.fastq")
OUT_PATH = os.path.join(DATA_DIR, "endangered_demo.fastq")


def load_read_ids_by_species(target_species: set[str]) -> dict[str, list[str]]:
    by_species: dict[str, list[str]] = {s: [] for s in target_species}
    with open(MANIFEST_PATH) as f:
        for row in csv.DictReader(f):
            species = row["species"]
            if species in by_species:
                by_species[species].append(row["read_id"])
    return by_species


def extract_reads(wanted_ids: set[str]) -> dict[str, tuple[str, str, str, str]]:
    """One pass over the (64 MB) fastq, keeping only records whose header
    matches a wanted read_id. Returns {read_id: (header, seq, plus, qual)}."""
    found: dict[str, tuple[str, str, str, str]] = {}
    with open(READS_PATH) as f:
        while True:
            header = f.readline().rstrip("\n")
            if not header:
                break
            seq = f.readline().rstrip("\n")
            plus = f.readline().rstrip("\n")
            qual = f.readline().rstrip("\n")
            read_id = header[1:]  # strip leading '@'
            if read_id in wanted_ids:
                found[read_id] = (header, seq, plus, qual)
    return found


def main():
    target_species = set(ENDANGERED_SPECIES) | set(CONTROL_SPECIES)
    ids_by_species = load_read_ids_by_species(target_species)

    for species, ids in ids_by_species.items():
        if not ids:
            raise SystemExit(f"No reads found for '{species}' in {MANIFEST_PATH} — check the species name.")

    wanted_ids: set[str] = set()
    picked_by_species: dict[str, list[str]] = {}
    for species, ids in ids_by_species.items():
        picked = ids[:READS_PER_SPECIES]
        picked_by_species[species] = picked
        wanted_ids.update(picked)

    records = extract_reads(wanted_ids)

    missing = wanted_ids - records.keys()
    if missing:
        raise SystemExit(f"{len(missing)} read_ids from the manifest weren't found in {READS_PATH} — dataset mismatch.")

    with open(OUT_PATH, "w") as out:
        for species in ENDANGERED_SPECIES + CONTROL_SPECIES:
            for read_id in picked_by_species[species]:
                header, seq, plus, qual = records[read_id]
                out.write(f"{header}\n{seq}\n{plus}\n{qual}\n")

    total_reads = sum(len(v) for v in picked_by_species.values())
    print(f"Wrote {total_reads} reads ({len(target_species)} species) to {OUT_PATH}")
    print(f"  Endangered ({READS_PER_SPECIES} reads each): {', '.join(ENDANGERED_SPECIES)}")
    print(f"  Control     ({READS_PER_SPECIES} reads each): {', '.join(CONTROL_SPECIES)}")


if __name__ == "__main__":
    main()
