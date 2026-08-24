import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import DnaHelix3D from "./DnaHelix3D";

const PAGE_SIZE = 10;

export default function SpeciesList() {
  const detections = useAppStore((s) => s.detections);
  const selectedSpecies = useAppStore((s) => s.selectedSpecies);
  const selectSpecies = useAppStore((s) => s.selectSpecies);
  const setScientificModalDetection = useAppStore((s) => s.setScientificModalDetection);
  const readsBySpecies = useAppStore((s) => s.readsBySpecies);
  const [showAll, setShowAll] = useState(false);

  const visibleDetections = showAll ? detections : detections.slice(0, PAGE_SIZE);
  const hiddenCount = detections.length - visibleDetections.length;

  const activeDetection = detections.find((d) => d.species === selectedSpecies) || null;
  const activeBioDetails = activeDetection
    ? getBioinformaticsData(
        activeDetection.species,
        activeDetection.read_count,
        activeDetection.confidence,
        5000,
        readsBySpecies[activeDetection.species]?.[0]
      )
    : null;

  return (
    <section id="assessment" className="scroll-mt-28 w-full max-w-[96vw] px-2 sm:px-4 mx-auto">
      {/* Outer Container with Dynamic Layout (Shifts left when species selected, pop-out 3D panel on right) */}
      <div className="flex flex-col lg:flex-row items-start gap-6 transition-all duration-500">
        {/* Species List Container (Slides left & expands to fill space when 3D panel active) */}
        <motion.div
          layout
          className={`w-full transition-all duration-500 ${selectedSpecies ? "lg:w-[62%] xl:w-[64%]" : "lg:w-full"}`}
        >
          <GlassPanel shape="round" hover={false} className="p-6 md:p-8">
            {/* Header Bar with Global Export Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
              <div>
                <h3 className="font-display text-2xl font-semibold text-glow">Detected Species &amp; Analysis</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Select any species to shift list and launch interactive 3D eDNA helix on the right
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
                </div>
              )}
            </div>

            {detections.length === 0 ? (
              <p className="text-slate-400 text-sm py-10 text-center">
                Upload a sample to see species detections, confidence scores, and conservation flags here.
              </p>
            ) : (
              <div className="flex flex-col gap-3.5">
                {visibleDetections.map((d) => {
                  const active = d.species === selectedSpecies;
                  const iucn = resolveIucnCategory(d.conservation_flag);
                  const bioDetails = getBioinformaticsData(
                    d.species,
                    d.read_count,
                    d.confidence,
                    5000,
                    readsBySpecies[d.species]?.[0]
                  );

                  return (
                    <div
                      key={d.species}
                      className={`glass glass-hover rounded-2xl p-4 transition-all duration-300 ${
                        active
                          ? "border-cyan-400/90 bg-slate-900/90 shadow-[0_0_30px_rgba(56,189,248,0.35)] ring-1 ring-cyan-400/40"
                          : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => selectSpecies(active ? null : d.species)}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-left w-full cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base italic text-slate-100 truncate flex items-center gap-2">
                            {d.species}
                            {active && (
                              <span className="text-[10px] text-cyan-300 font-sans not-italic font-bold bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-0.5 rounded-full animate-pulse">
                                🧬 3D DNA Active
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
                      </button>

                      {/* Expanded In-Card Scientific Details */}
                      {active && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-3.5 text-xs"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">IUCN Status</span>
                              <span className="font-semibold text-xs mt-1 block" style={{ color: iucn.color }}>
                                {iucn.code} — {iucn.label}
                              </span>
                            </div>

                            <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">
                                BLAST Confidence
                              </span>
                              <span className="font-semibold text-xs text-cyan-300 mt-1 block">
                                {(d.confidence * 100).toFixed(1)}% ({bioDetails.blastBitScore} bits)
                              </span>
                            </div>

                            <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Legal Schedule</span>
                              <span className="font-semibold text-xs text-slate-200 mt-1 block truncate">
                                {d.conservation_flag ? d.conservation_flag : "Standard Monitoring"}
                              </span>
                            </div>
                          </div>

                          {/* Quick Export Actions */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => exportAsFasta(d, readsBySpecies[d.species]?.[0])}
                                className="glass glass-hover rounded-xl px-3 py-1 text-xs font-semibold text-emerald-300 border-emerald-500/30 hover:border-emerald-400 transition-all"
                              >
                                🧬 FASTA
                              </button>
                              <button
                                type="button"
                                onClick={() => exportAsJson(d, readsBySpecies[d.species]?.[0])}
                                className="glass glass-hover rounded-xl px-3 py-1 text-xs font-semibold text-cyan-300 border-cyan-500/30 hover:border-cyan-400 transition-all"
                              >
                                📄 JSON
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setScientificModalDetection(d)}
                              className="glass glass-hover rounded-xl px-3.5 py-1 text-xs font-semibold text-glow-400 border-cyan-400/40 hover:border-cyan-300 transition-all"
                            >
                              🔬 Full Datasheet &rarr;
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {detections.length > PAGE_SIZE && (
              <div className="mt-5 flex flex-col items-center gap-2 pt-4 border-t border-white/10">
                <p className="text-xs text-slate-400">
                  Showing {visibleDetections.length} of {detections.length} species
                </p>
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="glass glass-hover rounded-full px-5 py-1.5 text-xs font-semibold text-cyan-300 border-cyan-500/30 hover:border-cyan-400 transition-all"
                >
                  {showAll ? "Show fewer species" : `Show ${hiddenCount} more species`}
                </button>
              </div>
            )}
          </GlassPanel>
        </motion.div>

        {/* POP-OUT 3D DNA HOLO-PANEL (Appears on the right when a species is clicked!) */}
        <AnimatePresence>
          {activeDetection && activeBioDetails && (
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full lg:w-[38%] xl:w-[36%] shrink-0 sticky top-24"
            >
              <GlassPanel shape="round" hover={false} className="p-5 md:p-6 border-cyan-400/50 shadow-[0_0_35px_rgba(56,189,248,0.25)] bg-slate-900/95">
                {/* 3D Panel Header */}
                <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-0.5 rounded-full">
                      Holographic 3D DNA Studio
                    </span>
                    <h4 className="font-display text-lg font-bold italic text-white mt-1 text-glow truncate">
                      {activeDetection.species}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectSpecies(null)}
                    className="glass glass-hover rounded-full p-1.5 text-slate-400 hover:text-white transition-all"
                    title="Close 3D View"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* 3D WebGL DNA Helix Canvas */}
                <DnaHelix3D
                  sequence={activeBioDetails.sequence}
                  speciesName={activeDetection.species}
                  height="h-[400px]"
                />

                {/* Sequence ATGC Barcode Highlight */}
                <div className="mt-4 rounded-xl bg-slate-950/90 p-3 border border-cyan-500/30">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      eDNA Barcode ({activeBioDetails.sequenceLength} bp &bull; GC: {activeBioDetails.gcContent}%)
                    </span>
                    <span className="text-[10px] text-slate-400">{activeBioDetails.markerGene}</span>
                  </div>

                  <div className="rounded-lg bg-black/80 p-2 font-mono text-[11px] tracking-widest leading-relaxed break-all select-all max-h-20 overflow-y-auto">
                    {activeBioDetails.sequence.split("").map((base, i) => {
                      let c = "text-slate-300";
                      if (base === "A") c = "text-emerald-400 font-bold";
                      else if (base === "T") c = "text-amber-400 font-bold";
                      else if (base === "G") c = "text-cyan-400 font-bold";
                      else if (base === "C") c = "text-fuchsia-400 font-bold";
                      return (
                        <span key={i} className={c}>
                          {base}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
