import { useAppStore } from "../../store/useAppStore";
import ConfidenceBadge from "../ui/ConfidenceBadge";
import ConservationBadge from "../ui/ConservationBadge";
import GlassPanel from "../ui/GlassPanel";

export default function SpeciesList() {
  const detections = useAppStore((s) => s.detections);
  const selectedSpecies = useAppStore((s) => s.selectedSpecies);
  const selectSpecies = useAppStore((s) => s.selectSpecies);

  return (
    <GlassPanel shape="round" hover={false} className="p-6 md:p-8">
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="font-display text-2xl font-semibold text-glow">Detected Species</h3>
        <span className="text-xs text-slate-400">{detections.length} detection{detections.length === 1 ? "" : "s"}</span>
      </div>

      {detections.length === 0 ? (
        <p className="text-slate-400 text-sm py-10 text-center">
          Upload a sample to see species detections, confidence scores, and conservation flags here.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {detections.map((d) => {
            const active = d.species === selectedSpecies;
            return (
              <button
                key={d.species}
                onClick={() => selectSpecies(d.species)}
                className={`glass glass-hover flex flex-col md:flex-row md:items-center gap-3 md:gap-6 rounded-2xl px-5 py-4 text-left transition-colors ${
                  active ? "border-glow-500/70" : ""
                }`}
                style={active ? { borderColor: "rgba(125, 211, 252, 0.7)" } : undefined}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium italic truncate">{d.species}</p>
                  <p className="text-xs text-slate-400">{d.read_count.toLocaleString()} reads</p>
                </div>
                <ConfidenceBadge confidence={d.confidence} />
                <ConservationBadge flag={d.conservation_flag} />
              </button>
            );
          })}
        </div>
      )}
    </GlassPanel>
  );
}
