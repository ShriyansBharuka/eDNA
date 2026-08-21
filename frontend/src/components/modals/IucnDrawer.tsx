import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "../../store/useAppStore";
import { IUCN_CATEGORIES } from "../../lib/iucn";

export default function IucnDrawer() {
  const open = useAppStore((s) => s.iucnOpen);
  const setOpen = useAppStore((s) => s.setIucnOpen);
  const close = () => setOpen(false);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="glass fixed right-0 top-0 z-[70] h-full w-full max-w-sm overflow-y-auto p-8 shape-angled"
          >
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-display text-xl font-semibold text-glow">IUCN Red List Guide</h3>
              <button onClick={close} className="text-slate-400 hover:text-slate-100 text-sm">
                Close
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              What each conservation flag on the species list means. Colors here match the badges shown there.
            </p>

            <div className="flex flex-col gap-3">
              {IUCN_CATEGORIES.map((c) => (
                <div key={c.code} className="glass rounded-2xl px-4 py-3 flex gap-3 items-start">
                  <span
                    className="mt-1 h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: c.color, boxShadow: `0 0 8px ${c.color}aa` }}
                  />
                  <div>
                    <p className="text-sm font-medium" style={{ color: c.color }}>
                      {c.code} — {c.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500 mt-8">
              Detections are also cross-checked against India's Wildlife Protection Act schedules where applicable.
            </p>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
