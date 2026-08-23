import { useAppStore } from "../../store/useAppStore";
import GlassPanel from "../ui/GlassPanel";

function MarkerPin() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  );
}

export default function DiscoveredReads() {
  const discovered = useAppStore((s) => s.discovered);
  const markerGene = useAppStore((s) => s.discoveredMarkerGene);
  const focusOnMap = useAppStore((s) => s.focusOnMap);
  const mapFocus = useAppStore((s) => s.mapFocus);
  const sampleLocation = useAppStore((s) => s.sampleLocation);

  // There's no per-read GPS in eDNA data, only a per-SAMPLE collection
  // point — so unlike the old mock (which faked a distinct site per read),
  // every "Locate on map" here honestly points at the same real place:
  // wherever this sample was actually collected.
  const locate = () => {
    focusOnMap(sampleLocation);
    requestAnimationFrame(() => {
      document.getElementById("distribution")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const active = mapFocus?.label === sampleLocation.label;

  return (
    <section id="discovered" className="scroll-mt-28">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-2xl font-semibold text-glow">Discovered</h3>
        <span className="text-xs text-slate-500">Real reads below the classifier's confidence threshold</span>
      </div>

      <p className="mb-6 max-w-2xl text-sm text-slate-400">
        Reads with no confident match anywhere in the reference database. These are the interesting ones — possible
        range extensions, under-sequenced taxa, or genuinely undescribed species.
      </p>

      <GlassPanel shape="round" hover={false} className="p-6 md:p-8">
        {discovered.length === 0 ? (
          <p className="text-slate-400 text-sm py-6 text-center">
            No low-confidence reads in this sample — every classified read matched a known species with confidence
            above the threshold.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {discovered.map((r) => (
              <div
                key={r.nearest_species}
                className="glass glass-hover flex flex-col gap-4 rounded-2xl px-5 py-4 md:flex-row md:items-center"
                style={active ? { borderColor: "rgba(244,114,182,0.7)", boxShadow: "0 0 28px rgba(244,114,182,0.3)" } : undefined}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {markerGene && (
                      <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] tracking-wide text-slate-300">
                        {markerGene}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">{r.read_count} reads</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Closest reference: <span className="italic text-slate-300">{r.nearest_species}</span> ·{" "}
                    {Math.round(r.nearest_identity * 100)}% identity — below the call threshold
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={locate}
                    className="glass glass-hover inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-medium"
                    style={{ color: "#f9a8d4", borderColor: "rgba(244,114,182,0.45)" }}
                  >
                    <MarkerPin />
                    Locate sample on map
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </section>
  );
}
