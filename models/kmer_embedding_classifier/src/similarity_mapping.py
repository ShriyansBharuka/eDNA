from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Iterable

import numpy as np
import torch

from .inference import DnaSpeciesPredictor
from .tokenizer import encode_sequence


PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parents[1]
DEFAULT_MANIFEST = REPO_ROOT / "simulated_data" / "manifest.csv"
DEFAULT_FASTQ = REPO_ROOT / "simulated_data" / "simulated_reads.fastq"
DEFAULT_OUTPUT_DIR = PACKAGE_ROOT / "similarity_map"


def read_manifest(path: str | Path) -> dict[str, dict[str, str]]:
    with Path(path).open(newline="", encoding="utf-8") as handle:
        return {row["read_id"]: row for row in csv.DictReader(handle)}


def iter_fastq(path: str | Path) -> Iterable[tuple[str, str]]:
    with Path(path).open(encoding="utf-8") as handle:
        while True:
            header = handle.readline().rstrip("\n")
            if not header:
                break
            sequence = handle.readline().rstrip("\n")
            plus = handle.readline().rstrip("\n")
            _quality = handle.readline()
            if not header.startswith("@") or plus != "+":
                raise ValueError(f"Malformed FASTQ record near {header!r}")
            yield header[1:].split()[0], sequence


def batched(items: Iterable[tuple[str, str, dict[str, str]]], batch_size: int):
    batch = []
    for item in items:
        batch.append(item)
        if len(batch) == batch_size:
            yield batch
            batch = []
    if batch:
        yield batch


def joined_records(manifest_path: str | Path, fastq_path: str | Path):
    manifest = read_manifest(manifest_path)
    for read_id, sequence in iter_fastq(fastq_path):
        row = manifest.get(read_id)
        if row is not None and row.get("species"):
            yield read_id, sequence, row


@torch.no_grad()
def extract_species_centroids(
    manifest_path: str | Path = DEFAULT_MANIFEST,
    fastq_path: str | Path = DEFAULT_FASTQ,
    output_dir: str | Path = DEFAULT_OUTPUT_DIR,
    checkpoint_path: str | Path | None = None,
    batch_size: int = 1024,
    device: str = "auto",
) -> dict:
    """Run batched inference and cache species-level centroid embeddings."""
    output_dir = Path(output_dir)
    embeddings_dir = output_dir / "embeddings"
    embeddings_dir.mkdir(parents=True, exist_ok=True)
    predictor = DnaSpeciesPredictor(checkpoint_path=checkpoint_path, device=device)
    predictor.model.eval()

    token_to_id = predictor.tokenizer["token_to_id"]
    k = predictor.tokenizer["k"]
    stride = predictor.tokenizer["stride"]
    pad_id = predictor.tokenizer["pad_id"]
    sums: dict[str, np.ndarray] = {}
    counts: Counter[str] = Counter()
    marker_counts: dict[str, Counter[str]] = defaultdict(Counter)
    accession_counts: dict[str, Counter[str]] = defaultdict(Counter)
    total_records = 0

    for batch in batched(joined_records(manifest_path, fastq_path), batch_size):
        encoded = [encode_sequence(sequence, token_to_id, k=k, stride=stride) for _read_id, sequence, _row in batch]
        max_len = max(len(ids) for ids in encoded)
        input_ids = torch.full((len(batch), max_len), pad_id, dtype=torch.long, device=predictor.device)
        for row_idx, ids in enumerate(encoded):
            input_ids[row_idx, : len(ids)] = torch.tensor(ids, dtype=torch.long, device=predictor.device)
        attention_mask = input_ids.ne(pad_id)
        output = predictor.model(input_ids, attention_mask)
        embeddings = output["embedding"].detach().cpu().numpy().astype(np.float64)
        for idx, (_read_id, _sequence, row) in enumerate(batch):
            species = row["species"]
            sums.setdefault(species, np.zeros(embeddings.shape[1], dtype=np.float64))
            sums[species] += embeddings[idx]
            counts[species] += 1
            marker_counts[species][row.get("marker", "")] += 1
            accession_counts[species][row.get("accession", "")] += 1
            total_records += 1

    species_names = sorted(sums)
    centroid_embeddings = np.stack([(sums[name] / counts[name]).astype(np.float32) for name in species_names])
    np.save(embeddings_dir / "species_centroid_embeddings.npy", centroid_embeddings)
    with (embeddings_dir / "species_metadata.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["node_id", "species", "sample_count", "markers", "top_accessions"])
        writer.writeheader()
        for idx, species in enumerate(species_names):
            writer.writerow(
                {
                    "node_id": f"species_{idx:03d}",
                    "species": species,
                    "sample_count": counts[species],
                    "markers": json.dumps(dict(marker_counts[species].most_common()), ensure_ascii=False),
                    "top_accessions": json.dumps(dict(accession_counts[species].most_common(5)), ensure_ascii=False),
                }
            )
    summary = {
        "level": "species_centroid",
        "total_joined_reads_processed": total_records,
        "num_species": len(species_names),
        "embedding_dimensionality": int(centroid_embeddings.shape[1]),
        "embedding_source": "KmerMeanMlpClassifier masked mean pooled embedding before classifier MLP",
        "embeddings_file": str(embeddings_dir / "species_centroid_embeddings.npy"),
        "metadata_file": str(embeddings_dir / "species_metadata.csv"),
    }
    (embeddings_dir / "embedding_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def load_species_cache(output_dir: str | Path = DEFAULT_OUTPUT_DIR) -> tuple[np.ndarray, list[dict[str, str]]]:
    output_dir = Path(output_dir)
    embeddings = np.load(output_dir / "embeddings" / "species_centroid_embeddings.npy")
    with (output_dir / "embeddings" / "species_metadata.csv").open(newline="", encoding="utf-8") as handle:
        metadata = list(csv.DictReader(handle))
    return embeddings, metadata


def cosine_similarity_matrix(embeddings: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True).clip(min=1e-12)
    normalized = embeddings / norms
    return normalized @ normalized.T


def build_knn_edges(similarity: np.ndarray, metadata: list[dict[str, str]], k_neighbors: int) -> list[dict]:
    edges: dict[tuple[str, str], dict] = {}
    for idx, row in enumerate(similarity):
        neighbor_indices = np.argsort(row)[::-1]
        neighbor_indices = [int(n) for n in neighbor_indices if n != idx][:k_neighbors]
        for neighbor in neighbor_indices:
            source = metadata[idx]["node_id"]
            target = metadata[neighbor]["node_id"]
            key = tuple(sorted((source, target)))
            edge = {
                "source": key[0],
                "target": key[1],
                "similarity": float(similarity[idx, neighbor]),
            }
            if key not in edges or edge["similarity"] > edges[key]["similarity"]:
                edges[key] = edge
    return sorted(edges.values(), key=lambda item: (item["source"], item["target"]))


def run_umap_projection(embeddings: np.ndarray, n_neighbors: int, min_dist: float, random_state: int) -> np.ndarray:
    try:
        import umap
    except ImportError as exc:
        raise ImportError(
            "UMAP projection requires the optional dependency 'umap-learn'. "
            "Install it with: python -m pip install umap-learn"
        ) from exc
    reducer = umap.UMAP(
        n_components=2,
        n_neighbors=n_neighbors,
        min_dist=min_dist,
        metric="cosine",
        random_state=random_state,
    )
    return reducer.fit_transform(embeddings).astype(np.float32)


def build_similarity_map(
    output_dir: str | Path = DEFAULT_OUTPUT_DIR,
    k_neighbors: int = 10,
    umap_neighbors: int = 15,
    min_dist: float = 0.1,
    random_state: int = 42,
) -> dict:
    output_dir = Path(output_dir)
    graph_dir = output_dir / "graph"
    map_dir = output_dir / "map"
    graph_dir.mkdir(parents=True, exist_ok=True)
    map_dir.mkdir(parents=True, exist_ok=True)
    embeddings, metadata = load_species_cache(output_dir)
    similarity = cosine_similarity_matrix(embeddings)
    np.save(graph_dir / "species_cosine_similarity.npy", similarity.astype(np.float32))
    edges = build_knn_edges(similarity, metadata, k_neighbors)
    coordinates = run_umap_projection(embeddings, umap_neighbors, min_dist, random_state)

    nodes = []
    for idx, row in enumerate(metadata):
        nodes.append(
            {
                "id": row["node_id"],
                "species": row["species"],
                "x": float(coordinates[idx, 0]),
                "y": float(coordinates[idx, 1]),
                "sample_count": int(row["sample_count"]),
                "markers": json.loads(row["markers"]),
                "top_accessions": json.loads(row["top_accessions"]),
            }
        )

    with (graph_dir / "species_knn_edges.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["source", "target", "similarity"])
        writer.writeheader()
        writer.writerows(edges)
    with (map_dir / "species_umap_coordinates.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["node_id", "species", "x", "y", "sample_count"])
        writer.writeheader()
        for node in nodes:
            writer.writerow({key: node[key if key != "node_id" else "id"] for key in ["node_id", "species", "x", "y", "sample_count"]})

    payload = {
        "schema_version": "1.0",
        "embedding_level": "species_centroid",
        "embedding_dimensionality": int(embeddings.shape[1]),
        "projection": {
            "method": "UMAP",
            "n_components": 2,
            "n_neighbors": umap_neighbors,
            "min_dist": min_dist,
            "metric": "cosine",
            "random_state": random_state,
        },
        "graph": {
            "type": "undirected_knn",
            "k_neighbors": k_neighbors,
            "edge_weight": "cosine_similarity_in_embedding_space",
        },
        "nodes": nodes,
        "edges": edges,
    }
    (map_dir / "similarity_map.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return {
        "nodes": len(nodes),
        "edges": len(edges),
        "embedding_dimensionality": int(embeddings.shape[1]),
        "similarity_matrix_file": str(graph_dir / "species_cosine_similarity.npy"),
        "edges_file": str(graph_dir / "species_knn_edges.csv"),
        "coordinates_file": str(map_dir / "species_umap_coordinates.csv"),
        "map_file": str(map_dir / "similarity_map.json"),
    }


def run_pipeline(args: argparse.Namespace) -> dict:
    output_dir = Path(args.output_dir)
    embeddings_file = output_dir / "embeddings" / "species_centroid_embeddings.npy"
    if args.rebuild_embeddings or not embeddings_file.exists():
        extract_summary = extract_species_centroids(
            manifest_path=args.manifest,
            fastq_path=args.fastq,
            output_dir=output_dir,
            checkpoint_path=args.checkpoint,
            batch_size=args.batch_size,
            device=args.device,
        )
    else:
        extract_summary = json.loads((output_dir / "embeddings" / "embedding_summary.json").read_text(encoding="utf-8"))
    map_summary = build_similarity_map(
        output_dir=output_dir,
        k_neighbors=args.k_neighbors,
        umap_neighbors=args.umap_neighbors,
        min_dist=args.min_dist,
        random_state=args.random_state,
    )
    summary = {"embedding_cache": extract_summary, "similarity_map": map_summary}
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "similarity_pipeline_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Build species-level similarity map artifacts from the final k-mer classifier.")
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    parser.add_argument("--fastq", default=str(DEFAULT_FASTQ))
    parser.add_argument("--checkpoint", default=None)
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument("--batch-size", type=int, default=1024)
    parser.add_argument("--device", default="auto")
    parser.add_argument("--k-neighbors", type=int, default=10)
    parser.add_argument("--umap-neighbors", type=int, default=15)
    parser.add_argument("--min-dist", type=float, default=0.1)
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument("--rebuild-embeddings", action="store_true")
    args = parser.parse_args()
    print(json.dumps(run_pipeline(args), indent=2))


if __name__ == "__main__":
    main()

