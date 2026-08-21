import { motion } from "framer-motion";
import { useAppStore } from "../../store/useAppStore";

export default function Navbar() {
  const heroDone = useAppStore((s) => s.heroDone);
  const setUploadOpen = useAppStore((s) => s.setUploadOpen);
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
          AquaVigil
        </a>

        <div className="hidden md:flex items-center gap-6 text-sm text-slate-300">
          <a href="#indices" className="glass-hover rounded-full px-3 py-1.5 transition-colors hover:text-glow-400">
            Indices
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
          <button
            onClick={() => setUploadOpen(true)}
            className="glass glass-hover rounded-full border-glow-500/40 px-4 py-1.5 text-sm font-medium text-glow-400"
            style={{ color: "#7dd3fc" }}
          >
            Upload Sample
          </button>
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
