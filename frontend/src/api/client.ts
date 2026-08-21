import type {
  ClassifySampleResponse,
  ConservationStatusResponse,
  DistributionResponse,
  IndicesResponse,
  MarkerGene,
  ResultsResponse,
  UploadSampleResponse,
} from "./types";

// All calls go through Vite's /api proxy (see vite.config.ts) to the FastAPI
// stub server, so nothing here needs to know about CORS or the backend port.
const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function uploadSample(file: File, markerGene: MarkerGene): Promise<UploadSampleResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("marker_gene", markerGene);
  return request<UploadSampleResponse>("/samples/upload", { method: "POST", body: form });
}

export function classifySample(sampleId: number): Promise<ClassifySampleResponse> {
  return request<ClassifySampleResponse>(`/samples/${sampleId}/classify`, { method: "POST" });
}

export function getResults(sampleId: number): Promise<ResultsResponse> {
  return request<ResultsResponse>(`/samples/${sampleId}/results`);
}

export function getIndices(sampleId: number): Promise<IndicesResponse> {
  return request<IndicesResponse>(`/samples/${sampleId}/indices`);
}

export function getDistribution(speciesName: string): Promise<DistributionResponse> {
  return request<DistributionResponse>(`/species/${encodeURIComponent(speciesName)}/distribution`);
}

export function getConservationStatus(speciesName: string): Promise<ConservationStatusResponse> {
  return request<ConservationStatusResponse>(`/species/${encodeURIComponent(speciesName)}/conservation-status`);
}
