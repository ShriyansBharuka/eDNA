import { FormEvent, useState } from "react";
import { classifySample, getIndices, getResults, uploadSample } from "../../api/client";
import type { MarkerGene } from "../../api/types";
import { useAppStore } from "../../store/useAppStore";
import GlassPanel from "../ui/GlassPanel";
import ModalShell from "./ModalShell";

const MARKER_GENES: MarkerGene[] = ["12S", "16S", "COI"];

export default function UploadModal() {
  const open = useAppStore((s) => s.uploadOpen);
  const setOpen = useAppStore((s) => s.setUploadOpen);
  const setSampleResults = useAppStore((s) => s.setSampleResults);

  const [file, setFile] = useState<File | null>(null);
  const [markerGene, setMarkerGene] = useState<MarkerGene>("COI");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setStatus("idle");
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setStatus("working");
    setError(null);
    try {
      const uploaded = await uploadSample(file, markerGene);
      await classifySample(uploaded.sample_id);
      const [results, indices] = await Promise.all([
        getResults(uploaded.sample_id),
        getIndices(uploaded.sample_id),
      ]);
      setSampleResults(uploaded.sample_id, results.detections, indices);
      setOpen(false);
      setStatus("idle");
      setFile(null);
      requestAnimationFrame(() => {
        document.getElementById("species")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return (
    <ModalShell open={open} onClose={close}>
      <GlassPanel shape="round" hover={false} className="p-8">
        <h3 className="font-display text-xl font-semibold text-glow mb-1">Upload Sample</h3>
        <p className="text-sm text-slate-400 mb-6">Submit raw eDNA reads for classification.</p>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-2">Reads file</label>
            <input
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-glow-500/20 file:px-4 file:py-2 file:text-glow-400 file:text-sm file:font-medium hover:file:bg-glow-500/30"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-2">Marker gene</label>
            <div className="flex gap-2">
              {MARKER_GENES.map((g) => (
                <button
                  type="button"
                  key={g}
                  onClick={() => setMarkerGene(g)}
                  className={`glass glass-hover rounded-full px-4 py-1.5 text-sm ${
                    markerGene === g ? "border-glow-500/70 text-glow-400" : "text-slate-300"
                  }`}
                  style={markerGene === g ? { borderColor: "rgba(125,211,252,0.7)", color: "#7dd3fc" } : undefined}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 mt-2">
            <button type="button" onClick={close} className="glass glass-hover rounded-full px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || status === "working"}
              className="glass glass-hover rounded-full px-5 py-2 text-sm font-medium disabled:opacity-50"
              style={{ color: "#7dd3fc", borderColor: "rgba(125,211,252,0.5)" }}
            >
              {status === "working" ? "Uploading…" : "Upload & Classify"}
            </button>
          </div>
        </form>
      </GlassPanel>
    </ModalShell>
  );
}
