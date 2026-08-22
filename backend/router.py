MARKER_TOOL_PREFERENCE = {
    "12S": "vsearch",
    "16S": "vsearch",
    "COI": "kraken2",
}


def get_preferred_tool(marker_gene):
    """Return which tool's answer to trust more for a given marker gene."""
    return MARKER_TOOL_PREFERENCE.get(marker_gene, "vsearch")  # default fallback

def consensus_call(marker_gene, vsearch_species, kraken2_species):
    """
    Combine VSEARCH and Kraken2's species guesses for one read into
    one final answer, plus an agreement label.
    """
    if vsearch_species == kraken2_species:
        return {
            "final_species": vsearch_species,
            "agreement": "both_agree",
            "confidence_boost": 1.0,
        }
    else:
        preferred = get_preferred_tool(marker_gene)
        final = vsearch_species if preferred == "vsearch" else kraken2_species
        return {
            "final_species": final,
            "agreement": "disagreement",
            "confidence_boost": 0.5,
        }

if __name__ == "__main__":
    # Quick manual test
    result = consensus_call("12S", "Calyptotis temporalis", "Calyptotis temporalis")
    print(result)

    result2 = consensus_call("COI", "Calyptotis temporalis", "Some Other Species")
    print(result2)