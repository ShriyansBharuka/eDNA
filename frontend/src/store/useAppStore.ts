import { create } from "zustand";
import type { Detection, IndicesResponse } from "../api/types";

interface AppState {
  heroDone: boolean;
  setHeroDone: (done: boolean) => void;

  sampleId: number | null;
  detections: Detection[];
  indices: IndicesResponse | null;
  setSampleResults: (sampleId: number, detections: Detection[], indices: IndicesResponse | null) => void;

  selectedSpecies: string | null;
  selectSpecies: (species: string | null) => void;

  /** Set by "Locate on map" on an unmatched read, so the map can fly to it. */
  mapFocus: MapFocus | null;
  focusOnMap: (focus: MapFocus | null) => void;

  authOpen: boolean;
  iucnOpen: boolean;
  endangeredOpen: boolean;
  scientificModalDetection: Detection | null;
  setAuthOpen: (open: boolean) => void;
  setIucnOpen: (open: boolean) => void;
  setEndangeredOpen: (open: boolean) => void;
  setScientificModalDetection: (d: Detection | null) => void;
  removeDetection: (speciesName: string) => void;
}

export interface MapFocus {
  lat: number;
  lon: number;
  label: string;
}

export const useAppStore = create<AppState>((set) => ({
  heroDone: false,
  setHeroDone: (done) => set({ heroDone: done }),

  sampleId: null,
  detections: [],
  indices: null,
  setSampleResults: (sampleId, detections, indices) => set({ sampleId, detections, indices }),

  selectedSpecies: null,
  selectSpecies: (species) => set({ selectedSpecies: species }),

  mapFocus: null,
  focusOnMap: (focus) => set({ mapFocus: focus }),

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
}));
