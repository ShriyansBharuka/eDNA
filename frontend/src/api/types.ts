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

export type MarkerGene = "12S" | "16S" | "COI";
