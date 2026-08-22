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


def classify_reads(sequences: list[str]) -> list[dict]:
    """
    sequences: raw DNA sequence strings.
    Returns one {"species": str, "confidence": float} per input sequence,
    same order — confidence is the classifier's own predicted probability
    for its top call (predict_proba, not a made-up number).
    """
    if not sequences:
        return []

    features = _vectorizer.transform(sequences)
    predictions = _classifier.predict(features)
    probabilities = _classifier.predict_proba(features)

    return [
        {"species": species, "confidence": round(float(probs.max()), 4)}
        for species, probs in zip(predictions, probabilities)
    ]


if __name__ == "__main__":
    # Smoke test against a couple of hand-written sequences — not expected
    # to be confident/correct (they're not real reads), just proves the
    # pipeline runs end to end.
    demo = classify_reads(["ACGTACGTACGTACGTACGTACGTACGTACGT", "TTTTAAAACCCCGGGGTTTTAAAACCCCGGGG"])
    for d in demo:
        print(d)
