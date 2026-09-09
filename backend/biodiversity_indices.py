import math
from species_counts import species_counts

def calculate_richness(counts: dict) -> int:
    """Richness = simply how many distinct species were found."""
    return len(counts)


def calculate_shannon_index(counts: dict) -> float:
    total_reads = sum(counts.values())
    if total_reads == 0:
        return 0.0

    h = 0.0
    for count in counts.values():
        if count == 0:
            continue
        p_i = count / total_reads
        h -= p_i * math.log(p_i)

    return h


def calculate_evenness(counts: dict) -> float:
    richness = calculate_richness(counts)
    if richness <= 1:
        return 0.0  # can't compute evenness with 0 or 1 species

    h = calculate_shannon_index(counts)
    return h / math.log(richness)


def calculate_all_indices(counts: dict) -> dict:
    return {
        "richness": calculate_richness(counts),
        "shannon_index": round(calculate_shannon_index(counts), 3),
        "evenness": round(calculate_evenness(counts), 3),
    }


if __name__ == "__main__":
    test_even = {"Species A": 50, "Species B": 50}
    print("Even split test (expect evenness near 1.0):", calculate_all_indices(test_even))

    test_skewed = {"Species A": 99, "Species B": 1}
    print("Skewed test (expect low evenness):", calculate_all_indices(test_skewed))

    print("\nReal ANVESH dataset result:")
    print(calculate_all_indices(dict(species_counts)))