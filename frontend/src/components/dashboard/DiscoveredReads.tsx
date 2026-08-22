import { MOCK_UNMATCHED_READS } from "../../lib/mockUnmatched";
import type { UnmatchedRead } from "../../lib/mockUnmatched";
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
  const focusOnMap = useAppStore((s) => s.focusOnMap);
  const mapFocus = useAppStore((s) => s.mapFocus);

  const locate = (r: UnmatchedRead) => {
    focusOnMap({ lat: r.lat, lon: r.lon, label: `${r.id} — ${r.site}` });
    requestAnimationFrame(() => {
      document.getElementById("distribution")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <section id="discovered" className="scroll-mt-28">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-2xl font-semibold text-glow">Discovered</h3>
        <span className="text-xs text-slate-500">Mock set — pending the unmatched-reads endpoint</span>
      </div>

      <p className="mb-6 max-w-2xl text-sm text-slate-400">
        Reads with no confident match anywhere in the reference database. These are the interesting ones — possible
        range extensions, under-sequenced taxa, or genuinely undescribed species.
      </p>

      <GlassPanel shape="round" hover={false} className="p-6 md:p-8">
        <div className="flex flex-col gap-3">
          {MOCK_UNMATCHED_READS.map((r) => {
            const active = mapFocus?.label.startsWith(r.id) ?? false;
            return (
              <div
                key={r.id}
                className="glass glass-hover flex flex-col gap-4 rounded-2xl px-5 py-4 md:flex-row md:items-center"
                style={active ? { borderColor: "rgba(244,114,182,0.7)", boxShadow: "0 0 28px rgba(244,114,182,0.3)" } : undefined}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium text-slate-100">{r.id}</span>
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] tracking-wide text-slate-300">
                      {r.marker}
                    </span>
                    <span className="text-xs text-slate-500">{r.read_count} reads</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Closest reference: <span className="italic text-slate-300">{r.nearest_species}</span> ·{" "}
                    {Math.round(r.nearest_identity * 100)}% identity — below the call threshold
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="hidden text-xs text-slate-500 lg:inline">{r.site}</span>
                  <button
                    onClick={() => locate(r)}
                    className="glass glass-hover inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-medium"
                    style={{ color: "#f9a8d4", borderColor: "rgba(244,114,182,0.45)" }}
                  >
                    <MarkerPin />
                    Locate on map
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </GlassPanel>
    </section>
  );
}
