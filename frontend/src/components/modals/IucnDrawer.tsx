import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { IUCN_CATEGORIES } from "../../lib/iucn";

export default function IucnDrawer() {
  const open = useAppStore((s) => s.iucnOpen);
  const setOpen = useAppStore((s) => s.setIucnOpen);
  const close = () => setOpen(false);

  // Close drawer when pressing Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Dark Backdrop Overlay */}
          <motion.div
            className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />

          {/* Drawer Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="fixed right-0 top-0 z-[90] flex h-full w-full max-w-md flex-col bg-slate-950/95 rounded-l-3xl border-l border-cyan-400/30 p-6 sm:p-8 backdrop-blur-2xl shadow-[-16px_0_50px_rgba(0,0,0,0.85)] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-5 mb-6">
              <div>
                <h3 className="font-display text-xl font-semibold text-sky-300 text-glow">
                  IUCN Red List Guide
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Global extinction risk categories &amp; conservation badges
                </p>
              </div>
              <button
                onClick={close}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-100 transition-colors"
                aria-label="Close drawer"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Categories List */}
            <div className="flex flex-col gap-3.5 flex-1">
              {IUCN_CATEGORIES.map((c) => (
                <div
                  key={c.code}
                  className="group rounded-2xl border border-white/10 bg-slate-900/80 p-4 transition-all duration-200 hover:border-cyan-500/40 hover:bg-slate-900/95 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] flex gap-3.5 items-start"
                >
                  <span
                    className="mt-1 flex h-6 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-slate-950"
                    style={{ background: c.color, boxShadow: `0 0 10px ${c.color}bb` }}
                  >
                    {c.code}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {c.label}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">{c.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Wildlife Protection Act Note Footer */}
            <div className="mt-8 border-t border-white/10 pt-5 text-xs text-slate-400 leading-relaxed">
              <p>
                <span className="font-semibold text-cyan-300">India Wildlife Act Integration:</span> Detections are also cross-checked against India's Wild Life (Protection) Act, 1972 schedules for localized legal status.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
