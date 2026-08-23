// Shapes mirror backend/main.py's stub responses exactly (the frozen API contract).

export interface UploadSampleResponse {
  sample_id: number;
  status: string;
  note: string;
}

export interface ClassifySampleResponse {
  sample_id: number;
  status: string;
  note: string;
}

export interface Detection {
  species: string;
  read_count: number;
  confidence: number;
  conservation_flag: string | null;
}

export interface ResultsResponse {
  sample_id: number;
  detections: Detection[];
  note: string;
}

export interface IndicesResponse {
  sample_id: number;
  richness: number;
  shannon_index: number;
  evenness: number;
  note: string;
}

export interface OccurrencePoint {
  lat: number;
  lon: number;
}

export interface DistributionResponse {
  species: string;
  occurrence_points: OccurrencePoint[];
  note: string;
}

export interface ConservationStatusResponse {
  species: string;
  iucn_status: string;
  wildlife_act_schedule: string;
  note: string;
}

export interface SimilarityNeighbor {
  species: string;
  similarity: number;
  x: number;
  y: number;
}

export interface SimilarityResponse {
  species: string;
  x: number;
  y: number;
  neighbors: SimilarityNeighbor[];
}

export interface LiveSimilarityNeighbor {
  species: string;
  similarity: number;
}

export interface LiveSimilarityResponse {
  sample_id: number;
  species: string;
  query_read_count: number;
  self_similarity: number | null;
  neighbors: LiveSimilarityNeighbor[];
}

export interface SampleReadsResponse {
  sample_id: number;
  reads_by_species: Record<string, string[]>;
}

export interface UnmatchedGroup {
  nearest_species: string;
  nearest_identity: number;
  read_count: number;
}

export interface DiscoveredResponse {
  sample_id: number;
  marker_gene: MarkerGene;
  confidence_threshold: number;
  unmatched: UnmatchedGroup[];
  note: string;
}

export type MarkerGene = "12S" | "16S" | "COI";
