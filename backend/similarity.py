"""
Genetic similarity map (component 7) — real precomputed reference relationships.

Serves models/kmer_embedding_classifier/similarity_map/map/similarity_map.json:
500 species nodes with real UMAP 2D coordinates, and a real k=10 nearest-
neighbor graph weighted by cosine similarity in the 192-D embedding space of
the separately trained kmer_mean_mlp classifier (see that model's own
SIMILARITY_MAP_README.md for how it was built).

This is the *reference* map — genuinely learned relationships between known
species, not a live embedding of an individual uploaded read. Loaded once at
import (same lazy-singleton pattern classifier.py already uses).
"""

import json
import os
from collections import defaultdict

_MAP_PATH = os.path.join(
    os.path.dirname(__file__), "..", "models", "kmer_embedding_classifier",
    "similarity_map", "map", "similarity_map.json",
)

with open(_MAP_PATH) as f:
    _graph = json.load(f)

_NODES_BY_SPECIES = {node["species"]: node for node in _graph["nodes"]}

# The edge list is undirected but each pair is only listed once — index both
# directions so every species can look up its own neighbors directly.
_NEIGHBORS_BY_SPECIES = defaultdict(list)
for edge in _graph["edges"]:
    _NEIGHBORS_BY_SPECIES[edge["source"]].append((edge["target"], edge["similarity"]))
    _NEIGHBORS_BY_SPECIES[edge["target"]].append((edge["source"], edge["similarity"]))

_ID_TO_SPECIES = {node["id"]: node["species"] for node in _graph["nodes"]}


def get_similarity(species: str, top_k: int = 8) -> dict | None:
    """
    Returns the species' own position plus its top_k real nearest neighbors
    (by cosine similarity, descending), or None if the species isn't in the
    graph — every species the live classifier can currently detect is (same
    500-species vocabulary), but a future model swap could change that, so
    this stays a real check rather than an assumption.
    """
    node = _NODES_BY_SPECIES.get(species)
    if node is None:
        return None

    neighbor_ids = sorted(_NEIGHBORS_BY_SPECIES.get(node["id"], []), key=lambda x: x[1], reverse=True)[:top_k]
    neighbors = []
    for neighbor_id, similarity in neighbor_ids:
        neighbor_species = _ID_TO_SPECIES[neighbor_id]
        neighbor_node = _NODES_BY_SPECIES[neighbor_species]
        neighbors.append({
            "species": neighbor_species,
            "similarity": round(similarity, 4),
            "x": neighbor_node["x"],
            "y": neighbor_node["y"],
        })

    return {
        "species": species,
        "x": node["x"],
        "y": node["y"],
        "neighbors": neighbors,
    }
