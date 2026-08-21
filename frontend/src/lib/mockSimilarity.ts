// MOCK — the similarity-map endpoint (2D projected coordinates + genetic
// distance per species, from the UMAP/GNN projection work described in
// docs/architecture.md §4) doesn't exist in backend/main.py yet — only the
// 6 contract endpoints are stubbed there, and this isn't one of them.
// This mirrors the shape that future response is expected to have, so
// swapping in a real `fetch` later is a one-line change.

export interface SimilarityNode {
  id: string;
  isUnknown?: boolean;
}

export interface SimilarityEdge {
  source: string;
  target: string;
  distance: number; // smaller = more genetically similar
}

export const MOCK_SIMILARITY_NODES: SimilarityNode[] = [
  { id: "Unidentified sequence", isUnknown: true },
  { id: "Thunnus albacares" },
  { id: "Katsuwonus pelamis" },
  { id: "Sardinella longiceps" },
  { id: "Rastrelliger kanagurta" },
  { id: "Carcharhinus melanopterus" },
  { id: "Chelonia mydas" },
];

export const MOCK_SIMILARITY_EDGES: SimilarityEdge[] = [
  { source: "Unidentified sequence", target: "Thunnus albacares", distance: 0.18 },
  { source: "Unidentified sequence", target: "Katsuwonus pelamis", distance: 0.24 },
  { source: "Unidentified sequence", target: "Sardinella longiceps", distance: 0.55 },
  { source: "Unidentified sequence", target: "Rastrelliger kanagurta", distance: 0.61 },
  { source: "Thunnus albacares", target: "Katsuwonus pelamis", distance: 0.3 },
  { source: "Sardinella longiceps", target: "Rastrelliger kanagurta", distance: 0.35 },
];
