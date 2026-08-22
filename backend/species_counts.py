from collections import Counter

ref_seqname_to_species = {}
with open("12S_database.fasta") as f:
    for line in f:
        if line.startswith(">"):
            parts = line[1:].strip().split(None, 2)
            seqname = parts[0]
            species_and_rest = parts[2] if len(parts) > 2 else ""
            species_words = species_and_rest.split()
            species_name = " ".join(species_words[:2]) if len(species_words) >= 2 else species_and_rest
            ref_seqname_to_species[seqname] = species_name

species_counts = Counter()
with open("vsearch_clean.tsv") as f:
    for line in f:
        cols = line.strip().split("\t")
        if len(cols) < 2:
            continue
        target = cols[1]
        species = ref_seqname_to_species.get(target)
        if species:
            species_counts[species] += 1

if __name__ == "__main__":
    print(f"Total distinct species matched: {len(species_counts)}")
    print("\nTop 10 species by read count:")
    for species, count in species_counts.most_common(10):
        print(f"  {species}: {count}")