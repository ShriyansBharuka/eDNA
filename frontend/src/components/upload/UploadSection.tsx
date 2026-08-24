import { DragEvent, FormEvent, useRef, useState } from "react";
import { classifySample, getDiscovered, getIndices, getResults, getSampleReads, uploadSample } from "../../api/client";
import type { MarkerGene } from "../../api/types";
import { useAppStore } from "../../store/useAppStore";

const MARKER_GENES: { id: MarkerGene; blurb: string }[] = [
  { id: "12S", blurb: "Vertebrate-biased, short amplicon" },
  { id: "16S", blurb: "Broad vertebrate coverage" },
  { id: "COI", blurb: "Standard barcode, deepest reference set" },
];

type Phase = "idle" | "uploading" | "classifying" | "done" | "error";

const PHASE_COPY: Record<Exclude<Phase, "idle" | "error">, string> = {
  uploading: "Uploading reads…",
  classifying: "Running the classifier ensemble…",
  done: "Done — results are below.",
};

export default function UploadSection() {
  const setSampleResults = useAppStore((s) => s.setSampleResults);
  const setReadsBySpecies = useAppStore((s) => s.setReadsBySpecies);
  const setDiscovered = useAppStore((s) => s.setDiscovered);
  const selectSpecies = useAppStore((s) => s.selectSpecies);
  const setSampleLocation = useAppStore((s) => s.setSampleLocation);
  const authToken = useAppStore((s) => s.authToken);

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [markerGene, setMarkerGene] = useState<MarkerGene>("COI");
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError(null);
    try {
      setPhase("uploading");
      const uploaded = await uploadSample(file, markerGene, authToken);
      setPhase("classifying");
      await classifySample(uploaded.sample_id);
      const [results, indices, reads, discovered] = await Promise.all([
        getResults(uploaded.sample_id),
        getIndices(uploaded.sample_id),
        getSampleReads(uploaded.sample_id),
        getDiscovered(uploaded.sample_id),
      ]);
      setSampleResults(uploaded.sample_id, results.detections, indices);
      setReadsBySpecies(reads.reads_by_species);
      setDiscovered(discovered.unmatched, discovered.marker_gene);
      setSampleLocation({
        lat: 15.4989 + (Math.random() * 1.5 - 0.75),
        lon: 73.8278 + (Math.random() * 1.5 - 0.75),
        label: `Uploaded Sample #${uploaded.sample_id} (${file.name})`,
      });
      if (results.detections[0]) selectSpecies(results.detections[0].species);
      setPhase("done");
      // selectSpecies() above auto-opens the 3D DNA helix panel, which
      // mounts a whole WebGL scene synchronously in its own effect right
      // after this render — that (plus the map/similarity fetches this
      // same store update kicks off elsewhere) was enough main-thread work
      // still in flight that a same-frame requestAnimationFrame scroll call
      // never visibly moved the page at all. A short delay lets that settle
      // before we scroll.
      setTimeout(() => {
        document.getElementById("species")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const busy = phase === "uploading" || phase === "classifying";

  return (
    <section id="upload" className="scroll-mt-28 w-full max-w-2xl">
      <div className="mb-7 text-center">
        <p className="text-[11px] uppercase tracking-[0.32em] text-glow-400/80" style={{ color: "rgba(125,211,252,0.8)" }}>
          Start here
        </p>
        <h3 className="mt-3 font-display text-3xl font-semibold text-glow md:text-4xl">Upload a sample</h3>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-300/85">
          Drop in raw eDNA reads and ANVESH returns species calls, confidence, conservation flags and
          biodiversity metrics.
        </p>
      </div>

      <form onSubmit={submit} className="glass glass-hover shape-round p-7 md:p-9">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="group cursor-pointer rounded-3xl border border-dashed px-6 py-10 text-center transition-all duration-300"
          style={{
            borderColor: dragging ? "rgba(125,211,252,0.85)" : file ? "rgba(94,234,212,0.5)" : "rgba(125,211,252,0.3)",
            background: dragging ? "rgba(56,189,248,0.12)" : "rgba(125,211,252,0.04)",
            boxShadow: dragging ? "0 0 42px rgba(56,189,248,0.35) inset" : "none",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".fastq,.fq,.fasta,.fa,.gz,.txt"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <svg
            viewBox="0 0 24 24"
            width="34"
            height="34"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4 text-glow-400 transition-transform duration-300 group-hover:-translate-y-1"
            style={{ color: "#7dd3fc" }}
          >
            <path d="M12 16V4" />
            <path d="M7 9l5-5 5 5" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>

          {file ? (
            <>
              <p className="text-sm font-medium text-slate-100">{file.name}</p>
              <p className="mt-1 text-xs text-slate-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB · click to choose a different file
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-200">Drop your reads file here</p>
              <p className="mt-1 text-xs text-slate-400">or click to browse — FASTQ / FASTA, optionally gzipped</p>
            </>
          )}
        </div>

        <div className="mt-7">
          <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-400">Marker gene</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {MARKER_GENES.map((g) => {
              const active = markerGene === g.id;
              return (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => setMarkerGene(g.id)}
                  className="glass glass-hover rounded-2xl px-4 py-3 text-left transition-all"
                  style={
                    active
                      ? {
                          borderColor: "rgba(125,211,252,0.75)",
                          boxShadow: "0 0 26px rgba(56,189,248,0.35), inset 0 1px 0 0 rgba(255,255,255,0.2)",
                        }
                      : undefined
                  }
                >
                  <span
                    className="font-display text-base font-semibold"
                    style={{ color: active ? "#7dd3fc" : "#e2e8f0" }}
                  >
                    {g.id}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">{g.blurb}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-slate-400" aria-live="polite">
            {phase === "error" ? (
              <span className="text-red-400">{error}</span>
            ) : phase === "idle" ? (
              "Nothing leaves your machine until you submit."
            ) : (
              PHASE_COPY[phase]
            )}
          </p>

          <button
            type="submit"
            disabled={!file || busy}
            className="glass glass-hover rounded-full px-7 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-45"
            style={{
              color: "#7dd3fc",
              borderColor: file && !busy ? "rgba(125,211,252,0.65)" : undefined,
              boxShadow: file && !busy ? "0 0 30px rgba(56,189,248,0.35)" : undefined,
            }}
          >
            {busy ? "Analysing…" : "Upload & classify"}
          </button>
        </div>
      </form>
    </section>
  );
}
