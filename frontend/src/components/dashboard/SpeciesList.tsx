import { useAppStore } from "../../store/useAppStore";
import ConfidenceBadge from "../ui/ConfidenceBadge";
import ConservationBadge from "../ui/ConservationBadge";
import GlassPanel from "../ui/GlassPanel";
import { resolveIucnCategory } from "../../lib/iucn";
import {
  getBioinformaticsData,
  exportAsFasta,
  exportAsJson,
  exportAsCsv,
  exportAllFasta,
} from "../../lib/bioinformatics";

export default function SpeciesList() {
  const detections = useAppStore((s) => s.detections);
  const selectedSpecies = useAppStore((s) => s.selectedSpecies);
  const selectSpecies = useAppStore((s) => s.selectSpecies);
  const setScientificModalDetection = useAppStore((s) => s.setScientificModalDetection);
  const readsBySpecies = useAppStore((s) => s.readsBySpecies);

  return (
    <GlassPanel shape="round" hover={false} className="p-6 md:p-8">
      {/* Header Bar with Global Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div>
          <h3 className="font-display text-2xl font-semibold text-glow">Detected Species &amp; Analysis</h3>
          <p className="text-xs text-slate-400 mt-1">
            Select any species to view IUCN status, model confidence, ATGC sequencing, and researcher exports
          </p>
        </div>

        {/* Global Dataset Export Actions */}
        {detections.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => exportAllFasta(detections, readsBySpecies)}
              className="glass glass-hover rounded-xl px-3 py-1.5 text-xs font-semibold text-emerald-300 border-emerald-500/30 hover:border-emerald-400 transition-all flex items-center gap-1.5"
              title="Download FASTA file for all detected species"
            >
              🧬 Export All (FASTA)
            </button>
            <button
              type="button"
              onClick={() => exportAsCsv(detections, readsBySpecies)}
              className="glass glass-hover rounded-xl px-3 py-1.5 text-xs font-semibold text-cyan-300 border-cyan-500/30 hover:border-cyan-400 transition-all flex items-center gap-1.5"
              title="Export Tabular CSV Report"
            >
              📊 Export CSV
            </button>
            <span className="text-xs text-slate-400 ml-1">
              {detections.length} detection{detections.length === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>

      {detections.length === 0 ? (
        <p className="text-slate-400 text-sm py-10 text-center">
          Upload a sample to see species detections, confidence scores, and conservation flags here.
        </p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {detections.map((d) => {
            const active = d.species === selectedSpecies;
            const iucn = resolveIucnCategory(d.conservation_flag);
            const realSequence = readsBySpecies[d.species]?.[0];
            const bioDetails = getBioinformaticsData(d.species, d.read_count, d.confidence, 5000, realSequence);

            return (
              <div
                key={d.species}
                className={`glass glass-hover rounded-2xl p-4 transition-all duration-300 ${
                  active ? "border-cyan-400/80 bg-slate-900/90 shadow-[0_0_24px_rgba(56,189,248,0.25)]" : ""
                }`}
              >
                {/* A <div role="button"> here, not a real <button> — ConservationBadge
                    below is itself a clickable button, and HTML doesn't allow a
                    <button> nested inside another <button> (invalid DOM, and browsers
                    handle the nested control's focus/click inconsistently). This stays
                    keyboard-accessible via tabIndex + onKeyDown instead. */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => selectSpecies(active ? null : d.species)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectSpecies(active ? null : d.species);
                    }
                  }}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-left w-full cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base italic text-slate-100 truncate flex items-center gap-2">
                      {d.species}
                      {active && (
                        <span className="text-xs text-cyan-400 font-sans not-italic font-normal">
                          &bull; Active Analysis
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {d.read_count.toLocaleString()} reads detected &bull; Common:{" "}
                      <span className="text-slate-300 font-medium">{bioDetails.commonName}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <ConfidenceBadge confidence={d.confidence} />
                    <ConservationBadge flag={d.conservation_flag} />
                  </div>
                </div>

                {/* Expanded Species Analysis & Researcher Details */}
                {active && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-4 text-xs">
                    {/* Basic Status Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                        <span className="text-slate-400 block uppercase tracking-wider text-[10px]">IUCN Status</span>
                        <span className="font-semibold text-sm mt-1 block" style={{ color: iucn.color }}>
                          {iucn.code} — {iucn.label}
                        </span>
                        <p className="text-slate-300 mt-1 text-[11px] leading-snug">{iucn.description}</p>
                      </div>

                      <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                        <span className="text-slate-400 block uppercase tracking-wider text-[10px]">
                          Model Confidence &amp; BLAST
                        </span>
                        <span className="font-semibold text-sm text-cyan-300 mt-1 block">
                          {(d.confidence * 100).toFixed(1)}% Match ({bioDetails.blastBitScore} bits)
                        </span>
                        <p className="text-slate-300 mt-1 text-[11px]">E-Value: {bioDetails.eValue} &bull; Q36 Quality</p>
                      </div>

                      <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                        <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Legal Schedule</span>
                        <span className="font-semibold text-sm text-slate-200 mt-1 block">
                          {d.conservation_flag ? d.conservation_flag : "Standard Monitoring"}
                        </span>
                        <p className="text-slate-300 mt-1 text-[11px]">India Wildlife Protection Act schedule evaluation.</p>
                      </div>
                    </div>

                    {/* eDNA Barcode Sequence Snippet & Color Highlights */}
                    <div className="rounded-xl bg-slate-950/80 p-3.5 border border-cyan-500/20">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          eDNA Barcode ATGC Sequence ({bioDetails.sequenceLength} bp &bull; GC: {bioDetails.gcContent}%)
                        </span>
                        <span className="text-[10px] text-slate-400">{bioDetails.markerGene}</span>
                      </div>

                      {/* Sequence Highlight */}
                      <div className="rounded-lg bg-black/70 p-2.5 font-mono text-[11px] tracking-widest text-slate-300 overflow-x-auto select-all">
                        {bioDetails.isRealSequence ? (
                          <>
                            {bioDetails.sequence.slice(0, 100).split("").map((base, i) => {
                              let c = "text-slate-300";
                              if (base === "A") c = "text-emerald-400 font-bold";
                              else if (base === "T") c = "text-amber-400 font-bold";
                              else if (base === "G") c = "text-cyan-400 font-bold";
                              else if (base === "C") c = "text-fuchsia-400 font-bold";
                              return <span key={i} className={c}>{base}</span>;
                            })}
                            {bioDetails.sequenceLength > 100 && (
                              <span className="text-slate-500 font-sans italic ml-1">... [full sequence in download]</span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-500 font-sans italic">Loading this sample's real read…</span>
                        )}
                      </div>
                    </div>

                    {/* Researcher Export Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => exportAsFasta(d, realSequence)}
                          className="glass glass-hover rounded-xl px-3 py-1.5 text-xs font-semibold text-emerald-300 border-emerald-500/30 hover:border-emerald-400 transition-all flex items-center gap-1"
                        >
                          🧬 Download FASTA
                        </button>
                        <button
                          type="button"
                          onClick={() => exportAsJson(d, realSequence)}
                          className="glass glass-hover rounded-xl px-3 py-1.5 text-xs font-semibold text-cyan-300 border-cyan-500/30 hover:border-cyan-400 transition-all flex items-center gap-1"
                        >
                          📄 Download JSON
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setScientificModalDetection(d)}
                        className="glass glass-hover rounded-xl px-4 py-1.5 text-xs font-semibold text-glow-400 border-cyan-400/40 hover:border-cyan-300 transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                      >
                        🔬 View Full Scientific Datasheet &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </GlassPanel>
  );
}
