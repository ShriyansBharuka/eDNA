import { useAppStore } from "../../store/useAppStore";
import ConfidenceBadge from "../ui/ConfidenceBadge";
import ConservationBadge from "../ui/ConservationBadge";
import GlassPanel from "../ui/GlassPanel";
import { resolveIucnCategory } from "../../lib/iucn";

export default function SpeciesList() {
  const detections = useAppStore((s) => s.detections);
  const selectedSpecies = useAppStore((s) => s.selectedSpecies);
  const selectSpecies = useAppStore((s) => s.selectSpecies);

  return (
    <GlassPanel shape="round" hover={false} className="p-6 md:p-8">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h3 className="font-display text-2xl font-semibold text-glow">Detected Species &amp; Analysis</h3>
          <p className="text-xs text-slate-400 mt-1">Select any species to view detailed IUCN conservation status &amp; metrics</p>
        </div>
        <span className="text-xs text-slate-400">{detections.length} detection{detections.length === 1 ? "" : "s"}</span>
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

            return (
              <div
                key={d.species}
                className={`glass glass-hover rounded-2xl p-4 transition-all duration-300 ${
                  active ? "border-cyan-400/80 bg-slate-900/90 shadow-[0_0_24px_rgba(56,189,248,0.25)]" : ""
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
                      {active && <span className="text-xs text-cyan-400 font-sans not-italic font-normal">&bull; Active Analysis</span>}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{d.read_count.toLocaleString()} reads detected</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <ConfidenceBadge confidence={d.confidence} />
                    <ConservationBadge flag={d.conservation_flag} />
                  </div>
                </button>

                {/* Expanded Species Analysis Detail */}
                {active && (
                  <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                      <span className="text-slate-400 block uppercase tracking-wider text-[10px]">IUCN Status</span>
                      <span className="font-semibold text-sm mt-1 block" style={{ color: iucn.color }}>
                        {iucn.code} — {iucn.label}
                      </span>
                      <p className="text-slate-300 mt-1 text-[11px] leading-snug">{iucn.description}</p>
                    </div>

                    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                      <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Confidence Match</span>
                      <span className="font-semibold text-sm text-cyan-300 mt-1 block">
                        {(d.confidence * 100).toFixed(1)}% Match
                      </span>
                      <p className="text-slate-300 mt-1 text-[11px]">Amplicon barcode reference database hit.</p>
                    </div>

                    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                      <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Legal Protection</span>
                      <span className="font-semibold text-sm text-slate-200 mt-1 block">
                        {d.conservation_flag ? d.conservation_flag : "Standard Monitoring"}
                      </span>
                      <p className="text-slate-300 mt-1 text-[11px]">India Wildlife Protection Act schedule evaluation.</p>
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
