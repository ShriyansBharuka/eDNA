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

  uploadOpen: boolean;
  authOpen: boolean;
  iucnOpen: boolean;
  setUploadOpen: (open: boolean) => void;
  setAuthOpen: (open: boolean) => void;
  setIucnOpen: (open: boolean) => void;
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

  uploadOpen: false,
  authOpen: false,
  iucnOpen: false,
  setUploadOpen: (open) => set({ uploadOpen: open }),
  setAuthOpen: (open) => set({ authOpen: open }),
  setIucnOpen: (open) => set({ iucnOpen: open }),
}));
