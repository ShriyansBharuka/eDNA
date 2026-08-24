import { create } from "zustand";
import type { Detection, IndicesResponse, MarkerGene, UnmatchedGroup } from "../api/types";

interface AppState {
  heroDone: boolean;
  setHeroDone: (done: boolean) => void;

  sampleId: number | null;
  detections: Detection[];
  indices: IndicesResponse | null;
  setSampleResults: (sampleId: number, detections: Detection[], indices: IndicesResponse | null) => void;

  /** Real raw reads for the current sample, grouped by classified species —
   * used so the eDNA barcode sequence shown/exported per species is a real
   * sequenced read, not a fabricated one. */
  readsBySpecies: Record<string, string[]>;
  setReadsBySpecies: (reads: Record<string, string[]>) => void;

  /** Real low-confidence reads for the current sample, grouped by nearest
   * (rejected) species guess — powers the Discovered panel. */
  discovered: UnmatchedGroup[];
  discoveredMarkerGene: MarkerGene | null;
  setDiscovered: (unmatched: UnmatchedGroup[], markerGene: MarkerGene) => void;

  selectedSpecies: string | null;
  selectSpecies: (species: string | null) => void;

  /** Set by "Locate on map" on an unmatched read, so the map can fly to it. */
  mapFocus: MapFocus | null;
  focusOnMap: (focus: MapFocus | null) => void;

  sampleLocation: MapFocus;
  setSampleLocation: (loc: MapFocus) => void;

  authOpen: boolean;
  iucnOpen: boolean;
  endangeredOpen: boolean;
  scientificModalDetection: Detection | null;
  setAuthOpen: (open: boolean) => void;
  setIucnOpen: (open: boolean) => void;
  setEndangeredOpen: (open: boolean) => void;
  setScientificModalDetection: (d: Detection | null) => void;
  removeDetection: (speciesName: string) => void;

  /** Real GitHub-login session — token is a backend JWT, persisted to
   * localStorage so a reload doesn't sign the user out. */
  authToken: string | null;
  authUser: AuthUser | null;
  setAuth: (token: string | null, user: AuthUser | null) => void;
  logout: () => void;
}

export interface MapFocus {
  lat: number;
  lon: number;
  label: string;
}

export interface AuthUser {
  id: number;
  email: string | null;
  username: string | null;
  avatarUrl: string | null;
}

const AUTH_TOKEN_STORAGE_KEY = "anvesh_auth_token";

export const useAppStore = create<AppState>((set) => ({
  heroDone: false,
  setHeroDone: (done) => set({ heroDone: done }),

  sampleId: null,
  detections: [],
  indices: null,
  setSampleResults: (sampleId, detections, indices) => set({ sampleId, detections, indices }),

  readsBySpecies: {},
  setReadsBySpecies: (reads) => set({ readsBySpecies: reads }),

  discovered: [],
  discoveredMarkerGene: null,
  setDiscovered: (unmatched, markerGene) => set({ discovered: unmatched, discoveredMarkerGene: markerGene }),

  selectedSpecies: null,
  selectSpecies: (species) => set({ selectedSpecies: species }),

  mapFocus: null,
  focusOnMap: (focus) => set({ mapFocus: focus }),

  sampleLocation: { lat: 15.4989, lon: 73.8278, label: "Sample #1 — Mandovi Estuary / Goa Coast (15.5°N, 73.8°E)" },
  setSampleLocation: (loc) => set({ sampleLocation: loc }),

  authOpen: false,
  iucnOpen: false,
  endangeredOpen: false,
  scientificModalDetection: null,
  setAuthOpen: (open) => set({ authOpen: open }),
  setIucnOpen: (open) => set({ iucnOpen: open }),
  setEndangeredOpen: (open) => set({ endangeredOpen: open }),
  setScientificModalDetection: (d) => set({ scientificModalDetection: d }),

  removeDetection: (speciesName) =>
    set((state) => ({
      detections: state.detections.filter((d) => d.species.toLowerCase() !== speciesName.toLowerCase()),
      selectedSpecies: state.selectedSpecies?.toLowerCase() === speciesName.toLowerCase() ? null : state.selectedSpecies,
    })),

  // Read once at store creation (module load), not per-render — fine for a
  // plain SPA with no SSR concerns here.
  authToken: localStorage.getItem(AUTH_TOKEN_STORAGE_KEY),
  authUser: null,
  setAuth: (token, user) => {
    if (token) localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    set({ authToken: token, authUser: user });
  },
  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    set({ authToken: null, authUser: null });
  },
}));
