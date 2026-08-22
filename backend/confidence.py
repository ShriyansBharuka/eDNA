# confidence.py
# AquaVigil - Confidence Layer (Component 4)
# Combines classifier agreement (from router.py) and match identity (%id from VSEARCH)
# into one simple, explainable confidence score per detection.

from router import consensus_call

# Weights - how much each factor contributes to the final score.
# Kept simple and tunable, as the spec asks for.
AGREEMENT_WEIGHT = 0.6
IDENTITY_WEIGHT = 0.4


def calculate_confidence(marker_gene, vsearch_species, kraken_species, vsearch_identity):
    """
    vsearch_species: species name VSEARCH predicted
    kraken_species: species name Kraken2 predicted
    vsearch_identity: VSEARCH's %identity for this match, as a number 0-100
                       (this is the "how close was the match" signal)

    Returns a dict with the final species call, agreement info,
    and one confidence score between 0 and 1.
    """
    result = consensus_call(marker_gene, vsearch_species, kraken_species)

    # Agreement component: both_agree = full score, disagreement = half.
    # BUT: agreement is only trusted at full strength if the match itself is strong.
    # Below 97% identity, cap the agreement bonus - this is the genus-confusion
    # zone (e.g. Calyptotis vs Plestiodon at ~85-90% identity), where both tools
    # can independently land on the same WRONG close relative.
    IDENTITY_TRUST_THRESHOLD = 97.0

    if result["agreement"] == "both_agree":
        if vsearch_identity >= IDENTITY_TRUST_THRESHOLD:
            agreement_score = 1.0
        else:
            agreement_score = 0.6  # agreement without a strong match = weaker signal
    else:
        agreement_score = 0.5

    # Identity component: normalize %identity (0-100) to a 0-1 scale
    identity_score = vsearch_identity / 100.0

    # Combine into one final confidence score
    confidence_score = (AGREEMENT_WEIGHT * agreement_score) + (IDENTITY_WEIGHT * identity_score)

    return {
        "final_species": result["final_species"],
        "agreement": result["agreement"],
        "confidence_score": round(confidence_score, 3),
    }


if __name__ == "__main__":
    # Case 1: both tools agree, strong match (e.g. 100% identity)
    case1 = calculate_confidence(
        marker_gene="12S",
        vsearch_species="Calyptotis temporalis",
        kraken_species="Calyptotis temporalis",
        vsearch_identity=100.0,
    )
    print("Case 1 (agree, strong match):", case1)

    # Case 2: genus-confusion case, tools disagree, decent but not perfect match
    case2 = calculate_confidence(
        marker_gene="12S",
        vsearch_species="Scincella reevesii",
        kraken_species="Calyptotis temporalis",
        vsearch_identity=85.0,
    )
    print("Case 2 (disagree, weaker match):", case2)

    # Case 3: both tools agree, but on a wrong/close-relative species (weaker match)
    case3 = calculate_confidence(
        marker_gene="12S",
        vsearch_species="Plestiodon chinensis",
        kraken_species="Plestiodon chinensis",
        vsearch_identity=88.0,
    )
    print("Case 3 (agree, but on a close relative):", case3)
