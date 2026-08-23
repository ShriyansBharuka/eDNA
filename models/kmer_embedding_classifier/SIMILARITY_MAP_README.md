# Similarity Mapping Pipeline

## Purpose

This component builds a species-level similarity map from the finalized k-mer embedding classifier. It is an interpretation and visualization layer: it exposes relationships in the learned embedding space, not another classifier.

## Embedding Source and Dimensionality

The reference architecture document describes a 512-dimensional embedding, but the finalized model in `models/kmer_embedding_classifier/` produces a 192-dimensional embedding. This was verified from the actual checkpoint and source code.

The embedding used here is:

```text
KmerMeanMlpClassifier embedding layer
  -> masked mean pooling
  -> 192-D sequence embedding
  -> classifier MLP
```

The similarity map uses the 192-D pooled sequence embedding before the classifier MLP. It does not retrain or modify the classifier.

## Pipeline

```text
DNA reads
  -> finalized k-mer embedding classifier
  -> per-read 192-D embeddings
  -> species centroid aggregation
  -> cosine similarity matrix
  -> k-nearest-neighbor graph
  -> UMAP 2-D projection
  -> JSON/CSV/NPY artifacts for backend/frontend handoff
```

## Aggregation

The script aggregates read-level embeddings into species-level centroids:

```text
species_embedding = mean(all read embeddings for that species)
```

This produces one node per species, reducing read-level noise and keeping the visualization compact for the 500-class benchmark.

## Similarity and Graph

Cosine similarity is computed between species centroid embeddings. The graph is an undirected k-nearest-neighbor graph.

Default graph setting:

```text
k_neighbors = 10
```

Edge weights are cosine similarities computed in the original embedding space, not distances measured in the 2-D UMAP plot.

## UMAP Configuration

Default UMAP settings:

```text
n_components = 2
n_neighbors = 15
min_dist = 0.1
metric = "cosine"
random_state = 42
```

These are practical starting parameters from the architecture document, not finalized biological validation settings.

## Generated Files

Generated artifacts are written under `similarity_map/`:

- `embeddings/species_centroid_embeddings.npy`
  - NumPy array shaped `[num_species, 192]`
- `embeddings/species_metadata.csv`
  - Columns: `node_id`, `species`, `sample_count`, `markers`, `top_accessions`
- `embeddings/embedding_summary.json`
  - Cache summary and verified embedding dimensionality
- `graph/species_cosine_similarity.npy`
  - Dense species-by-species cosine similarity matrix
- `graph/species_knn_edges.csv`
  - Columns: `source`, `target`, `similarity`
- `map/species_umap_coordinates.csv`
  - Columns: `node_id`, `species`, `x`, `y`, `sample_count`
- `map/similarity_map.json`
  - Frontend/backend-friendly payload with `nodes`, `edges`, projection metadata, and graph metadata
- `similarity_pipeline_summary.json`
  - High-level summary of generated artifacts

## Regenerate the Map

Install runtime dependencies:

```bash
python -m pip install -r models/kmer_embedding_classifier/requirements.txt
```

Run from the repository root:

```bash
python -m models.kmer_embedding_classifier.src.similarity_mapping --rebuild-embeddings
```

To reuse cached species centroid embeddings and only rebuild graph/projection:

```bash
python -m models.kmer_embedding_classifier.src.similarity_mapping
```

## Backend/Frontend Handoff

No backend code change was required. The current backend does not expose a similarity-map endpoint, so this component produces clean artifacts for later integration.

The most useful handoff file is:

```text
models/kmer_embedding_classifier/similarity_map/map/similarity_map.json
```

Its top-level structure is:

```json
{
  "schema_version": "1.0",
  "embedding_level": "species_centroid",
  "embedding_dimensionality": 192,
  "projection": {},
  "graph": {},
  "nodes": [],
  "edges": []
}
```

Each node contains:

```text
id
species
x
y
sample_count
markers
top_accessions
```

Each edge contains:

```text
source
target
similarity
```

## Assumptions and Limitations

- The finalized classifier produces 192-D embeddings, not the 512-D embeddings described in the reference architecture.
- The generated map visualizes learned representation similarity, not confirmed taxonomy or evolutionary distance.
- UMAP preserves local neighborhoods better than absolute global distances; do not overinterpret distances on the 2-D plot.
- The current output is species-level. Read-level maps could be added later, but they would produce much larger artifacts.
- UMAP requires the optional `umap-learn` package.

