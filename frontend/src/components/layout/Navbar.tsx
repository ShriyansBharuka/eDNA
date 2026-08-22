import { motion } from "framer-motion";
import { useAppStore } from "../../store/useAppStore";

export default function Navbar() {
  const heroDone = useAppStore((s) => s.heroDone);
  const setAuthOpen = useAppStore((s) => s.setAuthOpen);
  const setIucnOpen = useAppStore((s) => s.setIucnOpen);

  return (
    // Always mounted (never conditionally added/removed via AnimatePresence):
    // toggling this in and out of the tree on every hero-boundary crossing is
    // what triggered React's "insertBefore" crash when scroll direction
    // flipped quickly. A plain animate-prop transition avoids mount/unmount
    // entirely.
    <motion.header
      initial={false}
      animate={heroDone ? { opacity: 1, y: 0 } : { opacity: 0, y: -16 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ pointerEvents: heroDone ? "auto" : "none" }}
      className="fixed inset-x-0 top-0 z-50 px-4 pt-4"
    >
      <nav className="glass shape-round mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <a href="#top" className="font-display font-semibold tracking-tight text-glow shrink-0">
          Gravity Falls
        </a>

        <div className="hidden items-center gap-5 text-sm text-slate-300 lg:flex">
          <a href="#assessment" className="glass-hover rounded-full px-3 py-1.5 transition-colors hover:text-glow-400">
            Biodiversity Assessment
          </a>
          <a href="#discovered" className="glass-hover rounded-full px-3 py-1.5 transition-colors hover:text-glow-400">
            Discovered
          </a>
          <a
            href="#distribution"
            className="glass-hover rounded-full px-3 py-1.5 transition-colors hover:text-glow-400"
          >
            Distribution Map
          </a>
          <button
            onClick={() => setIucnOpen(true)}
            className="glass-hover rounded-full px-3 py-1.5 transition-colors hover:text-glow-400"
          >
            IUCN Guidelines
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#upload"
            className="glass glass-hover rounded-full px-4 py-1.5 text-sm font-medium"
            style={{ color: "#7dd3fc", borderColor: "rgba(125,211,252,0.45)" }}
          >
            Upload Sample
          </a>
          <button
            onClick={() => setAuthOpen(true)}
            className="glass glass-hover rounded-full px-4 py-1.5 text-sm font-medium text-slate-100"
          >
            Login / Signup
          </button>
        </div>
      </nav>
    </motion.header>
  );
}
