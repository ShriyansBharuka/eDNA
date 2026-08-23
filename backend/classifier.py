"""
Real species classifier (component 3, classical baseline).

The full BarcodeBERT + BiLSTM + self-attention architecture lives in
../Model/ but has no trained checkpoint yet — only this 5-mer TF-IDF +
Logistic Regression baseline does (Model/results/final_results.json:
98.66% test accuracy across 500 species, trained on simulated_data/
manifest.csv). This is what's real and load-bearing today.

Loaded once at import (same lazy-load-at-module-scope pattern
species_counts.py already uses), so importing this module has a real
one-time cost but every classify_reads() call after that is just a
batched vectorizer transform + predict.
"""

import os

import joblib

_CHECKPOINT_DIR = os.path.join(os.path.dirname(__file__), "..", "Model", "checkpoints")

_vectorizer = joblib.load(os.path.join(_CHECKPOINT_DIR, "tfidf_5mer_vectorizer.pkl"))
_classifier = joblib.load(os.path.join(_CHECKPOINT_DIR, "kmer_logistic_regression.pkl"))

# scripts/simulate_reads.py only ever fragments the FORWARD strand of the
# reference database — there's no reverse-complement augmentation anywhere
# in training. Real reads can come from either strand with no way to know
# which upfront, and a k-mer classifier sees a near-unrelated feature
# profile from the wrong strand: verified on real reads, the same sequence
# that classifies at 89-94% confidence on its trained (forward) strand drops
# to 5-49% confidence with the WRONG species on its reverse-complement.
# Classifying both orientations and keeping the more confident one fixes
# this without retraining — full IUPAC table, not just ACGT, so ambiguity
# codes (N, R, Y, ...) complement correctly too.
_IUPAC_COMPLEMENT = str.maketrans(
    "ACGTRYSWKMBDHVN",
    "TGCAYRSWMKVHDBN",
)


def _reverse_complement(seq: str) -> str:
    return seq.translate(_IUPAC_COMPLEMENT)[::-1]


def classify_reads(sequences: list[str]) -> list[dict]:
    """
    sequences: raw DNA sequence strings.
    Returns one {"species": str, "confidence": float} per input sequence,
    same order — confidence is the classifier's own predicted probability
    for its top call (predict_proba, not a made-up number), taken from
    whichever strand orientation (forward or reverse-complement) the
    classifier was more confident about.
    """
    if not sequences:
        return []

    n = len(sequences)
    both_strands = sequences + [_reverse_complement(s) for s in sequences]

    features = _vectorizer.transform(both_strands)
    predictions = _classifier.predict(features)
    probabilities = _classifier.predict_proba(features)

    results = []
    for i in range(n):
        fwd_conf, rev_conf = float(probabilities[i].max()), float(probabilities[i + n].max())
        if fwd_conf >= rev_conf:
            results.append({"species": predictions[i], "confidence": round(fwd_conf, 4)})
        else:
            results.append({"species": predictions[i + n], "confidence": round(rev_conf, 4)})
    return results


if __name__ == "__main__":
    # Smoke test against a couple of hand-written sequences — not expected
    # to be confident/correct (they're not real reads), just proves the
    # pipeline runs end to end.
    demo = classify_reads(["ACGTACGTACGTACGTACGTACGTACGTACGT", "TTTTAAAACCCCGGGGTTTTAAAACCCCGGGG"])
    for d in demo:
        print(d)
