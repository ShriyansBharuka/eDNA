import { motion } from "framer-motion";
import { useAppStore } from "../../store/useAppStore";

export default function Navbar() {
  const heroDone = useAppStore((s) => s.heroDone);
  const setAuthOpen = useAppStore((s) => s.setAuthOpen);
  const setIucnOpen = useAppStore((s) => s.setIucnOpen);
  const setEndangeredOpen = useAppStore((s) => s.setEndangeredOpen);
  const authUser = useAppStore((s) => s.authUser);
  const logout = useAppStore((s) => s.logout);

  return (
    <motion.header
      initial={false}
      animate={heroDone ? { opacity: 1, y: 0 } : { opacity: 0, y: -16 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ pointerEvents: heroDone ? "auto" : "none" }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4"
    >
      <nav className="glass shape-round mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6 sm:py-3">
        {/* Brand Title */}
        <a href="#top" className="font-display text-base font-semibold tracking-tight text-glow shrink-0">
          ANVESH
        </a>

        {/* Evenly Spaced Nav Options */}
        <div className="hidden items-center justify-evenly gap-1.5 text-xs sm:text-sm text-slate-200 lg:flex flex-1 mx-4">
          <a href="#assessment" className="glass-hover rounded-full px-3 py-1.5 text-center transition-all hover:text-cyan-300">
            Biodiversity Assessment
          </a>
          <a href="#discovered" className="glass-hover rounded-full px-3 py-1.5 text-center transition-all hover:text-cyan-300">
            Discovered
          </a>
          <a href="#distribution" className="glass-hover rounded-full px-3 py-1.5 text-center transition-all hover:text-cyan-300">
            Distribution Map
          </a>
          <a href="#similarity" className="glass-hover rounded-full px-3 py-1.5 text-center transition-all hover:text-cyan-300">
            Similarity Map
          </a>
          <button
            onClick={() => setEndangeredOpen(true)}
            className="glass-hover rounded-full px-3 py-1.5 font-semibold text-rose-300 hover:text-rose-200 transition-all flex items-center gap-1.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
            Endangered Species
          </button>
          <button
            onClick={() => setIucnOpen(true)}
            className="glass-hover rounded-full px-3 py-1.5 text-center transition-all hover:text-cyan-300"
          >
            IUCN Guidelines
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="#upload"
            className="glass glass-hover rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-semibold"
            style={{ color: "#7dd3fc", borderColor: "rgba(125,211,252,0.45)" }}
          >
            Upload Sample
          </a>
          {authUser ? (
            <button
              onClick={logout}
              title="Log out"
              className="glass glass-hover flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-xs sm:text-sm font-medium text-slate-100"
            >
              {authUser.avatarUrl ? (
                <img src={authUser.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
              ) : (
                <span className="h-6 w-6 rounded-full bg-cyan-500/30" />
              )}
              {authUser.username ?? authUser.email ?? "Account"}
            </button>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="glass glass-hover rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-100"
            >
              Login / Signup
            </button>
          )}
        </div>
      </nav>
    </motion.header>
  );
}
