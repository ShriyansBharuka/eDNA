import type {
  ClassifySampleResponse,
  ConservationStatusResponse,
  DiscoveredResponse,
  DistributionResponse,
  IndicesResponse,
  LiveSimilarityResponse,
  MarkerGene,
  MeResponse,
  ResultsResponse,
  SampleReadsResponse,
  SimilarityResponse,
  UploadSampleResponse,
} from "./types";

// Local dev: goes through Vite's /api proxy (see vite.config.ts) to the
// FastAPI server on :8000, so nothing here needs to know about CORS or the
// port. Production build: set VITE_API_BASE_URL (in Vercel's project env
// vars) to the deployed Render backend's full URL — there's no dev proxy in
// a static production build, so this has to be a real absolute URL there.
const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    // FastAPI error responses are {"detail": "..."} — surface that real
    // message (e.g. "this doesn't look like a DNA file") instead of a bare
    // status code, so the user actually finds out what went wrong.
    let detail: string | undefined;
    try {
      const body = await res.json();
      detail = typeof body?.detail === "string" ? body.detail : undefined;
    } catch {
      // Response body wasn't JSON — fall back to the generic message below.
    }
    throw new Error(detail ?? `${init?.method ?? "GET"} ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function uploadSample(
  file: File,
  markerGene: MarkerGene,
  authToken?: string | null
): Promise<UploadSampleResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("marker_gene", markerGene);
  return request<UploadSampleResponse>("/samples/upload", {
    method: "POST",
    body: form,
    // Optional — the backend accepts anonymous uploads either way (see
    // get_optional_user), but attaching the token when a user is logged in
    // is what makes /samples/mine eventually mean anything for them.
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
  });
}

// GitHub OAuth is a full-page redirect, not a fetch — the browser needs to
// actually leave the app and land on github.com, so this just builds the
// URL for a plain <a href> / window.location.href, unlike every other
// function here.
export function githubLoginUrl(): string {
  return `${BASE}/auth/github/login`;
}

export function getMe(authToken: string): Promise<MeResponse> {
  return request<MeResponse>("/auth/me", { headers: { Authorization: `Bearer ${authToken}` } });
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

export function getSampleReads(sampleId: number): Promise<SampleReadsResponse> {
  return request<SampleReadsResponse>(`/samples/${sampleId}/reads`);
}

export function getDiscovered(sampleId: number): Promise<DiscoveredResponse> {
  return request<DiscoveredResponse>(`/samples/${sampleId}/discovered`);
}

export function getDistribution(speciesName: string): Promise<DistributionResponse> {
  return request<DistributionResponse>(`/species/${encodeURIComponent(speciesName)}/distribution`);
}

export function getConservationStatus(speciesName: string): Promise<ConservationStatusResponse> {
  return request<ConservationStatusResponse>(`/species/${encodeURIComponent(speciesName)}/conservation-status`);
}

export function getSimilarity(speciesName: string): Promise<SimilarityResponse> {
  return request<SimilarityResponse>(`/species/${encodeURIComponent(speciesName)}/similarity`);
}

export function getLiveSimilarity(sampleId: number, speciesName: string): Promise<LiveSimilarityResponse> {
  return request<LiveSimilarityResponse>(`/samples/${sampleId}/species/${encodeURIComponent(speciesName)}/similarity`);
}
