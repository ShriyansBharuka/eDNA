import sys
sys.path.append("../data/component_6")  
from confidence import calculate_confidence
from conservation_flag import flag_species

def build_detection(marker_gene, vsearch_species, kraken_species, vsearch_identity):
    conf_result = calculate_confidence(
        marker_gene, vsearch_species, kraken_species, vsearch_identity
    )
    flag_result = flag_species(conf_result["final_species"])

    return {
        "species_name": conf_result["final_species"],
        "confidence_score": conf_result["confidence_score"],
        "agreement": conf_result["agreement"],
        "conservation": flag_result,
    }

if __name__ == "__main__":
    result = build_detection(
        marker_gene="12S",
        vsearch_species="Rhincodon typus",
        kraken_species="Rhincodon typus",
        vsearch_identity=98.0,
    )
    print(result)