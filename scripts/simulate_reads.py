#!/usr/bin/env python3
"""
AquaVigil — simulated read generator (fallback, since nf-core/readsimulator
was skipped for this build).

Fragments real reference sequences from data/reference/*.fasta.gz and adds
random sequencing errors to produce training/test reads with known ground
truth — same core idea as the real pipeline, simpler error model (see the
honesty note in the original sample dataset's README).

Usage:
    python simulate_reads.py --n-species 500 --reads-per-seq 200

Outputs (into --outdir, default 'simulated_data/'):
    simulated_reads.fastq   — the reads
    manifest.csv            — read_id -> true species/marker/accession (ground truth labels)
"""

import argparse
import csv
import gzip
import os
import random

BASES = "ACGT"
MARKERS = ["12S", "16S", "COI"]


def parse_fasta_gz(path):
    header, seq = None, []
    with gzip.open(path, "rt") as f:
        for line in f:
            line = line.rstrip()
            if line.startswith(">"):
                if header is not None:
                    yield header, "".join(seq)
                header = line[1:]
                seq = []
            else:
                seq.append(line)
        if header is not None:
            yield header, "".join(seq)


def get_species_name(header):
    parts = header.split()
    if len(parts) >= 4:
        return parts[2] + " " + parts[3]
    return None


def mutate(seq, error_rate):
    out = []
    for base in seq:
        if base not in BASES:
            out.append(base)
            continue
        if random.random() < error_rate:
            out.append(random.choice([b for b in BASES if b != base]))
        else:
            out.append(base)
    return "".join(out)


def fake_quality(length, mean_q=36):
    quals = [max(2, min(40, int(random.gauss(mean_q, 3)))) for _ in range(length)]
    return "".join(chr(q + 33) for q in quals)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--reference-dir", default="data/reference",
                     help="Folder containing <MARKER>_database.fasta.gz files")
    ap.add_argument("--outdir", default="simulated_data")
    ap.add_argument("--n-species", type=int, default=500,
                     help="How many distinct species to sample (use -1 for all)")
    ap.add_argument("--reads-per-seq", type=int, default=200)
    ap.add_argument("--read-len", type=int, default=150)
    ap.add_argument("--error-rate", type=float, default=0.005)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    random.seed(args.seed)
    os.makedirs(args.outdir, exist_ok=True)

    # collect sequences by species across all three markers
    species_records = {}
    for marker in MARKERS:
        path = os.path.join(args.reference_dir, f"{marker}_database.fasta.gz")
        if not os.path.exists(path):
            print(f"  [skip] {path} not found")
            continue
        n = 0
        for header, seq in parse_fasta_gz(path):
            sp = get_species_name(header)
            if not sp or len(seq) < args.read_len + 20:
                continue
            species_records.setdefault(sp, {})
            if marker not in species_records[sp]:
                species_records[sp][marker] = (header, seq)
                n += 1
        print(f"  {marker}: {n} usable sequences")

    all_species = list(species_records.keys())
    random.shuffle(all_species)
    if args.n_species != -1:
        all_species = all_species[: args.n_species]
    print(f"Selected {len(all_species)} species out of {len(species_records)} available")

    fastq_path = os.path.join(args.outdir, "simulated_reads.fastq")
    manifest_path = os.path.join(args.outdir, "manifest.csv")
    read_id = 0

    with open(fastq_path, "w") as fq, open(manifest_path, "w", newline="") as mf:
        writer = csv.writer(mf)
        writer.writerow(["read_id", "species", "marker", "accession"])
        for sp in all_species:
            for marker, (header, seq) in species_records[sp].items():
                accession = header.split()[0]
                for _ in range(args.reads_per_seq):
                    start = random.randint(0, len(seq) - args.read_len)
                    fragment = seq[start:start + args.read_len]
                    read = mutate(fragment, args.error_rate)
                    read_id += 1
                    rid = f"sim{read_id}"
                    fq.write(f"@{rid}\n{read}\n+\n{fake_quality(len(read))}\n")
                    writer.writerow([rid, sp, marker, accession])

    print(f"\nWrote {read_id} reads -> {fastq_path}")
    print(f"Ground-truth labels -> {manifest_path}")


if __name__ == "__main__":
    main()
