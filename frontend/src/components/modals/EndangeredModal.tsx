import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import ConservationBadge from "../ui/ConservationBadge";

const THREATENED_FLAGS = new Set(["cr", "en", "vu", "nt", "ex", "ew", "critically endangered", "endangered", "vulnerable", "near threatened", "extinct"]);

export default function EndangeredModal() {
  const open = useAppStore((s) => s.endangeredOpen);
  const setOpen = useAppStore((s) => s.setEndangeredOpen);
  const detections = useAppStore((s) => s.detections);
  const removeDetection = useAppStore((s) => s.removeDetection);
  const selectSpecies = useAppStore((s) => s.selectSpecies);

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Filter species that have an IUCN or legal conservation flag
  const endangeredList = detections.filter((d) => {
    if (!d.conservation_flag) return false;
    const flag = d.conservation_flag.trim().toLowerCase();
    return THREATENED_FLAGS.has(flag) || flag.includes("schedule") || flag.includes("protected");
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />

          {/* Drawer / Modal Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="fixed right-0 top-0 z-[90] flex h-full w-full max-w-md flex-col bg-slate-950/95 rounded-l-3xl border-l border-amber-500/30 p-6 sm:p-8 backdrop-blur-2xl shadow-[-16px_0_50px_rgba(0,0,0,0.85)] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-5 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <h3 className="font-display text-xl font-semibold text-amber-300 text-glow">
                    Endangered Species ({endangeredList.length})
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Threatened &amp; protected species detected in the eDNA sample
                </p>
              </div>
              <button
                onClick={close}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-100 transition-colors"
                aria-label="Close modal"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Endangered Species List */}
            {endangeredList.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h4 className="text-base font-medium text-slate-200">No Endangered Species Flagged</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                  All detected species in this sample are currently cleared or categorized as Least Concern.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 flex-1">
                {endangeredList.map((d) => (
                  <div
                    key={d.species}
                    className="group relative rounded-2xl border border-white/10 bg-slate-900/80 p-4 transition-all duration-200 hover:border-amber-500/40 hover:bg-slate-900/95 shadow-md flex items-center justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        selectSpecies(d.species);
                        close();
                      }}
                      className="flex flex-col text-left flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-100 italic truncate group-hover:text-amber-300 transition-colors">
                          {d.species}
                        </span>
                        <ConservationBadge flag={d.conservation_flag} />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Confidence: <span className="text-amber-300 font-medium">{(d.confidence * 100).toFixed(1)}%</span> &middot; Reads: <span className="text-slate-200">{d.read_count.toLocaleString()}</span>
                      </p>
                    </button>

                    {/* Delete button for individual removal */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDetection(d.species);
                      }}
                      title={`Remove ${d.species} from list`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/25 hover:text-red-200 transition-colors border border-red-500/20"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 border-t border-white/10 pt-4 text-xs text-slate-400">
              <p>
                Click any species to view its analysis details, or click the <span className="text-red-400 font-bold">&times;</span> icon to remove it from this list.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
