// MOCK — the backend has no endpoint for unmatched reads yet (backend/main.py
// stubs only the 6 contract routes, and this isn't one of them). This mirrors
// the shape that response is expected to take, so swapping in a real fetch
// later is a one-line change.

export interface UnmatchedRead {
  id: string;
  marker: "12S" | "16S" | "COI";
  read_count: number;
  /** Best reference hit, well below the call threshold. */
  nearest_species: string;
  nearest_identity: number;
  /** Where this read's sample was collected. */
  lat: number;
  lon: number;
  site: string;
}

export const MOCK_UNMATCHED_READS: UnmatchedRead[] = [
  {
    id: "GF-U-0417",
    marker: "COI",
    read_count: 128,
    nearest_species: "Rastrelliger kanagurta",
    nearest_identity: 0.81,
    lat: 15.42,
    lon: 73.79,
    site: "Grande Island transect, Goa",
  },
  {
    id: "GF-U-0623",
    marker: "12S",
    read_count: 64,
    nearest_species: "Thunnus albacares",
    nearest_identity: 0.76,
    lat: 11.93,
    lon: 74.85,
    site: "Netrani shelf edge, Karnataka",
  },
  {
    id: "GF-U-0788",
    marker: "16S",
    read_count: 41,
    nearest_species: "Chelonia mydas",
    nearest_identity: 0.72,
    lat: 8.38,
    lon: 73.05,
    site: "Lakshadweep lagoon margin",
  },
  {
    id: "GF-U-0912",
    marker: "COI",
    read_count: 23,
    nearest_species: "Sardinella longiceps",
    nearest_identity: 0.68,
    lat: 19.02,
    lon: 72.71,
    site: "Mumbai coastal plume",
  },
];
