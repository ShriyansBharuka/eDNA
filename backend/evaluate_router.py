
import csv
import re
from router import consensus_call

# ---------- Step 1: Load manifest.csv (the ground truth) ----------
# read_id -> (true_species, marker_gene)
manifest = {}
with open("manifest.csv") as f:
    reader = csv.DictReader(f)
    for row in reader:
        manifest[row["read_id"]] = {
            "species": row["species"].strip(),
            "marker": row["marker"].strip(),
        }

print(f"Loaded {len(manifest)} entries from manifest.csv")

# ---------- Step 2: Load taxid -> species name mapping (names.dmp) ----------
taxid_to_name = {}
with open("12S_db/taxonomy/names.dmp") as f:
    for line in f:
        parts = line.split("|")
        taxid = parts[0].strip()
        name = parts[1].strip()
        name_type = parts[3].strip()
        if name_type == "scientific name":
            taxid_to_name[taxid] = name

print(f"Loaded {len(taxid_to_name)} taxid->name mappings")

ref_seqname_to_species = {}
with open("12S_database.fasta") as f:
    for line in f:
        if line.startswith(">"):
            # >12S_NC_073553.1:71-1018 1003736 Gymnothorax nudivomer ...
            parts = line[1:].strip().split(None, 2)
            seqname = parts[0]
            species_and_rest = parts[2] if len(parts) > 2 else ""
            # species name is usually first two words
            species_words = species_and_rest.split()
            species_name = " ".join(species_words[:2]) if len(species_words) >= 2 else species_and_rest
            ref_seqname_to_species[seqname] = species_name

vsearch_calls = {}
with open("vsearch_clean.tsv") as f:
    for line in f:
        cols = line.strip().split("\t")
        if len(cols) < 2:
            continue
        read_id, target = cols[0], cols[1]
        species = ref_seqname_to_species.get(target, None)
        if species:
            vsearch_calls[read_id] = species

print(f"Loaded {len(vsearch_calls)} VSEARCH calls")

# ---------- Step 4: Load Kraken2 results ----------
kraken_calls = {}
with open("kraken2_results.txt") as f:
    for line in f:
        cols = line.strip().split("\t")
        if len(cols) < 3:
            continue
        status, read_id, taxid = cols[0], cols[1], cols[2]
        if status == "C":
            species = taxid_to_name.get(taxid, None)
            if species:
                kraken_calls[read_id] = species

print(f"Loaded {len(kraken_calls)} Kraken2 calls")

# ---------- Step 5: Run consensus_call on every read, check against manifest ----------
correct = 0
total_checked = 0
both_agree_count = 0
disagreement_count = 0

for read_id, truth in manifest.items():
    true_species = truth["species"]
    marker = truth["marker"]

    vsearch_species = vsearch_calls.get(read_id)
    kraken_species = kraken_calls.get(read_id)

    # Skip reads where neither tool produced a call
    if not vsearch_species and not kraken_species:
        continue

    # If only one tool has a call, use it directly
    if vsearch_species and not kraken_species:
        final_species = vsearch_species
        agreement = "vsearch_only"
    elif kraken_species and not vsearch_species:
        final_species = kraken_species
        agreement = "kraken2_only"
    else:
        result = consensus_call(marker, vsearch_species, kraken_species)
        final_species = result["final_species"]
        agreement = result["agreement"]
        if agreement == "both_agree":
            both_agree_count += 1
        else:
            disagreement_count += 1

    total_checked += 1
    if final_species == true_species:
        correct += 1

print("\n--- RESULTS ---")
print(f"Total reads checked: {total_checked}")
print(f"Correct: {correct}")
if total_checked > 0:
    print(f"Accuracy: {correct / total_checked * 100:.2f}%")
print(f"Both tools agreed on: {both_agree_count} reads")
print(f"Tools disagreed on: {disagreement_count} reads")