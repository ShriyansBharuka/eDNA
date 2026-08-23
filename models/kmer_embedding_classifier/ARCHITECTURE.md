# K-mer Embedding Classifier Architecture

Short presentation view of the finalized eDNA taxonomic classifier and its similarity-map output.

## 1. Final 6-mer DL Classifier

```mermaid
flowchart LR
    A[DNA sequence] --> B[Overlapping 6-mer tokenization<br/>k=6, stride=1]
    B --> C[Token IDs]
    C --> D[Trainable 192-D embedding]
    D --> E[Masked mean pooling]
    E --> F[192-D learned sequence embedding]
    F --> G[LayerNorm + Dropout]
    G --> H[MLP: 192 -> 512<br/>GELU + Dropout]
    H --> I[Classifier: 512 -> 500 logits]
    I --> J[Species prediction]
    F --> K[Similarity mapping representation]
```

The classifier learns a compact 192-D sequence representation from overlapping 6-mers. That same 192-D learned embedding is reused by the similarity-mapping stage.

## 2. Similarity Mapping

```mermaid
flowchart LR
    A[192-D read embeddings] --> B[Species-level centroids<br/>mean embedding per species]
    B --> C[Cosine similarity]
    C --> D[kNN similarity graph<br/>edge = nearest-neighbor similarity]
    B --> E[UMAP 2-D projection<br/>cosine metric]
    D --> F[similarity_map.json]
    E --> F
    F --> G[Backend / frontend handoff]
```

The similarity map is not another classifier. It converts learned embeddings into species-level points, local similarity edges, and 2-D coordinates for visualization.

## Key Final Facts

- Overlapping 6-mers (`k=6`, `stride=1`)
- 192-D learned embedding
- 500 species/classes
- Classification head: `192 -> 512 -> 500`
- Similarity mapping uses the learned 192-D representation

