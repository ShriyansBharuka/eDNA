import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { getBioinformaticsData, exportAsFasta, exportAsJson } from "../../lib/bioinformatics";
import { resolveIucnCategory } from "../../lib/iucn";
import ConfidenceBadge from "../ui/ConfidenceBadge";

export default function ScientificModal() {
  const detection = useAppStore((s) => s.scientificModalDetection);
  const setDetection = useAppStore((s) => s.setScientificModalDetection);
  const readsBySpecies = useAppStore((s) => s.readsBySpecies);
  const [copied, setCopied] = useState(false);

  if (!detection) return null;

  const realSequence = readsBySpecies[detection.species]?.[0];
  const details = getBioinformaticsData(detection.species, detection.read_count, detection.confidence, 5000, realSequence);
  const iucn = resolveIucnCategory(detection.conservation_flag);

  const copySequence = () => {
    if (!details.isRealSequence) return;
    navigator.clipboard.writeText(details.sequence);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setDetection(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative z-10 w-full max-w-4xl rounded-3xl border border-cyan-500/30 bg-slate-900/95 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto"
        >
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                  Researcher Technical Datasheet
                </span>
                <span className="text-xs text-slate-400">&bull; eDNA Specimen Report</span>
              </div>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold italic text-white text-glow">
                {detection.species}
              </h2>
              <p className="text-sm font-medium text-slate-300 mt-0.5">{details.commonName}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => exportAsFasta(detection, realSequence)}
                className="glass glass-hover rounded-xl px-3.5 py-2 text-xs font-semibold text-emerald-300 border-emerald-500/30 hover:border-emerald-400 transition-all flex items-center gap-1.5"
              >
                🧬 Download FASTA
              </button>
              <button
                type="button"
                onClick={() => exportAsJson(detection, realSequence)}
                className="glass glass-hover rounded-xl px-3.5 py-2 text-xs font-semibold text-cyan-300 border-cyan-500/30 hover:border-cyan-400 transition-all flex items-center gap-1.5"
              >
                📄 Download JSON
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="glass glass-hover rounded-xl px-3 py-2 text-xs font-medium text-slate-300 transition-all"
                title="Print Scientific Datasheet"
              >
                🖨️
              </button>
              <button
                type="button"
                onClick={() => setDetection(null)}
                className="glass glass-hover rounded-full p-2 text-slate-400 hover:text-white transition-all ml-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="my-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Confidence Match
              </span>
              <div className="mt-1 flex items-center gap-2">
                <ConfidenceBadge confidence={detection.confidence} />
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                IUCN Status
              </span>
              <span className="mt-1 block font-display text-sm font-bold" style={{ color: iucn.color }}>
                {iucn.code} — {iucn.label}
              </span>
            </div>

            <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Sequence Reads
              </span>
              <span className="mt-1 block font-display text-sm font-bold text-slate-100">
                {detection.read_count.toLocaleString()} reads
              </span>
            </div>

            <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Relative Abundance
              </span>
              <span className="mt-1 block font-display text-sm font-bold text-cyan-300">
                {details.relativeAbundance}%
              </span>
            </div>
          </div>

          {/* Section 1: Taxonomic Hierarchy */}
          <div className="mb-6 rounded-2xl bg-slate-950/60 p-4 sm:p-5 border border-white/10">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300 mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              Taxonomic Rank Hierarchy
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-center text-xs">
              {Object.entries(details.taxonomy).map(([rank, val]) => (
                <div key={rank} className="rounded-xl bg-white/5 p-2 border border-white/5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block capitalize">
                    {rank === "className" ? "Class" : rank}
                  </span>
                  <span className="font-semibold text-slate-200 block truncate mt-0.5" title={val}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: eDNA Barcode Sequence Inspector */}
          <div className="mb-6 rounded-2xl bg-slate-950/70 p-4 sm:p-5 border border-cyan-500/25">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Target eDNA Barcode Nucleotide Sequence (ATGC)
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Target Marker: <span className="text-slate-200 font-medium">{details.markerGene}</span> &bull; Primer:{" "}
                  <span className="text-slate-200 font-medium">{details.primerSet}</span>
                  {details.isRealSequence && (
                    <>
                      {" "}
                      &bull; <span className="text-emerald-400 font-medium">one of this sample's own classified reads</span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-cyan-300 bg-cyan-950/50 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
                  GC: {details.gcContent}% ({details.sequenceLength} bp)
                </span>
                <button
                  type="button"
                  onClick={copySequence}
                  className="glass glass-hover rounded-xl px-3 py-1.5 text-xs font-medium text-slate-200 transition-all"
                >
                  {copied ? "✓ Copied!" : "📋 Copy Sequence"}
                </button>
              </div>
            </div>

            {/* Nucleotide Color Grid */}
            <div className="rounded-xl bg-black/80 p-4 border border-white/10 font-mono text-xs leading-relaxed tracking-wider break-all max-h-36 overflow-y-auto select-all">
              {details.isRealSequence ? (
                details.sequence.split("").map((base, idx) => {
                  let colorClass = "text-slate-300";
                  if (base === "A") colorClass = "text-emerald-400 font-bold";
                  else if (base === "T") colorClass = "text-amber-400 font-bold";
                  else if (base === "G") colorClass = "text-cyan-400 font-bold";
                  else if (base === "C") colorClass = "text-fuchsia-400 font-bold";

                  return (
                    <span key={idx} className={`${colorClass} px-[1px]`}>
                      {base}
                    </span>
                  );
                })
              ) : (
                <span className="text-slate-500 italic">Loading this sample's real read…</span>
              )}
            </div>

            <div className="mt-2.5 flex items-center gap-4 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> A = Adenine
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> T = Thymine
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block" /> G = Guanine
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-fuchsia-400 inline-block" /> C = Cytosine
              </span>
            </div>
          </div>

          {/* Section 3: Model Match & Alignment Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300 mb-3">
                Bioinformatics Alignment Metrics
              </h4>
              <ul className="space-y-2 text-xs">
                <li className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-slate-400">BLAST Bit Score:</span>
                  <span className="font-mono font-semibold text-slate-200">{details.blastBitScore} bits</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-slate-400">Expect Value (E-Value):</span>
                  <span className="font-mono font-semibold text-cyan-300">{details.eValue}</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-slate-400">Query Coverage:</span>
                  <span className="font-mono font-semibold text-slate-200">{details.queryCoverage}%</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-400">Phred Quality Score:</span>
                  <span className="font-mono font-semibold text-emerald-300">{details.qualityScore}</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300 mb-3">
                Ecological &amp; Habitat Profile
              </h4>
              <ul className="space-y-2 text-xs">
                <li className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-slate-400">Habitat Zone:</span>
                  <span className="font-medium text-slate-200">{details.waterColumn}</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-slate-400">Depth Range:</span>
                  <span className="font-medium text-slate-200">{details.depthZone}</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-slate-400">Legal Schedule:</span>
                  <span className="font-medium text-amber-300">
                    {detection.conservation_flag ? detection.conservation_flag : "Standard Monitoring"}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-400">Sequencing Platform:</span>
                  <span className="font-medium text-slate-200">Illumina MiSeq (2x300bp PE)</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
