"""
Live k-mer embedding + reference-centroid similarity (component 7, live path).

similarity.py serves the precomputed reference graph: real relationships
between the 500 TRAINING species, looked up by species NAME. This module is
the live counterpart — it embeds the ACTUAL reads classified into a given
species in a given uploaded sample, using the separately trained
kmer_mean_mlp PyTorch model (models/kmer_embedding_classifier/), then
compares that live embedding against every species' precomputed centroid
embedding. It answers "what is THIS sample's own sequence data actually
closest to", not "what is this species name closest to in the training set".

Loaded once at import (same lazy-singleton pattern classifier.py uses for
the sklearn baseline).
"""

import csv
import os
import sys

import numpy as np
import torch

_MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models", "kmer_embedding_classifier")
sys.path.append(_MODEL_DIR)
from src.inference import DnaSpeciesPredictor  # noqa: E402
from src.tokenizer import encode_sequence  # noqa: E402

_CENTROIDS_PATH = os.path.join(_MODEL_DIR, "similarity_map", "embeddings", "species_centroid_embeddings.npy")
_METADATA_PATH = os.path.join(_MODEL_DIR, "similarity_map", "embeddings", "species_metadata.csv")

_predictor = DnaSpeciesPredictor()

_centroids = np.load(_CENTROIDS_PATH).astype(np.float32)  # (500, 192)
_centroid_norms = _centroids / np.linalg.norm(_centroids, axis=1, keepdims=True)

_centroid_species: list[str] = []
with open(_METADATA_PATH) as f:
    for row in csv.DictReader(f):
        _centroid_species.append(row["species"])


@torch.no_grad()
def embed_sequences(sequences: list[str]) -> np.ndarray:
    """Real batched forward pass through the trained embedding model — returns (N, 192)."""
    if not sequences:
        return np.zeros((0, _centroids.shape[1]), dtype=np.float32)

    tokenizer = _predictor.tokenizer
    pad_id = tokenizer["pad_id"]
    token_lists = [
        encode_sequence(seq, token_to_id=tokenizer["token_to_id"], k=tokenizer["k"], stride=tokenizer["stride"])
        for seq in sequences
    ]
    max_len = max(len(t) for t in token_lists)
    padded = [t + [pad_id] * (max_len - len(t)) for t in token_lists]

    input_ids = torch.tensor(padded, dtype=torch.long, device=_predictor.device)
    attention_mask = input_ids.ne(pad_id)
    output = _predictor.model(input_ids, attention_mask)
    return output["embedding"].cpu().numpy()


def live_similarity(species: str, sequences: list[str], top_k: int = 8) -> dict | None:
    """
    Embeds the given reads for real, mean-pools them into one query vector,
    and scores it against all 500 species centroids by real cosine
    similarity. Returns None only if there are no sequences to embed.

    self_similarity is how closely this sample's own reads match the
    centroid of the species the classifier assigned them to (a live
    sanity check on the classification, not a made-up confidence number).
    neighbors excludes the queried species itself and is capped at top_k.
    """
    if not sequences:
        return None

    embeddings = embed_sequences(sequences)
    query = embeddings.mean(axis=0)
    query_norm = query / (np.linalg.norm(query) or 1.0)

    similarities = _centroid_norms @ query_norm  # (500,)
    ranked = sorted(zip(_centroid_species, similarities), key=lambda p: p[1], reverse=True)

    self_similarity = next((float(s) for name, s in ranked if name == species), None)
    neighbors = [
        {"species": name, "similarity": round(float(s), 4)}
        for name, s in ranked
        if name != species
    ][:top_k]

    return {
        "species": species,
        "query_read_count": len(sequences),
        "self_similarity": round(self_similarity, 4) if self_similarity is not None else None,
        "neighbors": neighbors,
    }
