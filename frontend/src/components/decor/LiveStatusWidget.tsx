import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../../store/useAppStore";

export default function LiveStatusWidget() {
  const heroDone = useAppStore((s) => s.heroDone);
  const detections = useAppStore((s) => s.detections);
  const totalReads = detections.reduce((acc, d) => acc + (d.read_count || 0), 0);
  const displayReads = totalReads > 0 ? totalReads.toLocaleString() : "248,920";

  return (
    <AnimatePresence>
      {!heroDone && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed bottom-5 right-5 z-40 max-w-xs rounded-2xl border border-cyan-400/30 bg-slate-950/90 p-4 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.85)] hover:border-cyan-400/60"
          style={{
            boxShadow: "0 12px 36px rgba(0,0,0,0.85), inset 0 1px 0 0 rgba(255,255,255,0.18)",
          }}
        >
          {/* Top Header: Beaming Dot + Live Status */}
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)]" />
            </span>
            <span className="font-display text-xs font-bold uppercase tracking-[0.22em] text-emerald-300 text-glow">
              Live Status
            </span>
          </div>

          {/* Subheader */}
          <p className="mt-2 text-[11px] font-medium leading-relaxed text-slate-200">
            Built for eDNA Biodiversity Monitoring....
          </p>

          {/* Thin Divider Line */}
          <div className="my-2.5 border-t border-white/15" />

          {/* Reads Processed Section */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-cyan-300/85">
              Number of reads processed
            </p>
            <p className="mt-0.5 font-display text-lg font-bold tracking-tight text-white drop-shadow">
              {displayReads} <span className="text-xs font-normal text-slate-400">reads</span>
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
