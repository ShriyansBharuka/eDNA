import { githubLoginUrl } from "../../api/client";
import { useAppStore } from "../../store/useAppStore";
import GlassPanel from "../ui/GlassPanel";
import ModalShell from "./ModalShell";

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.73.5.5 5.74.5 12.03c0 5.03 3.26 9.29 7.79 10.8.57.11.78-.25.78-.55 0-.27-.01-1.16-.02-2.11-3.17.69-3.84-1.36-3.84-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.72-1.53-2.53-.29-5.19-1.27-5.19-5.63 0-1.24.44-2.26 1.17-3.06-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.15 1.17a10.9 10.9 0 0 1 5.73 0c2.19-1.48 3.15-1.17 3.15-1.17.62 1.57.23 2.73.11 3.02.73.8 1.17 1.82 1.17 3.06 0 4.37-2.66 5.34-5.2 5.62.41.36.77 1.06.77 2.14 0 1.54-.01 2.79-.01 3.17 0 .3.2.67.79.55A10.53 10.53 0 0 0 23.5 12.03C23.5 5.74 18.27.5 12 .5Z" />
    </svg>
  );
}

export default function AuthModal() {
  const open = useAppStore((s) => s.authOpen);
  const setOpen = useAppStore((s) => s.setAuthOpen);

  const close = () => setOpen(false);

  return (
    <ModalShell open={open} onClose={close}>
      <GlassPanel shape="round" hover={false} className="p-8">
        <div className="text-center mb-6">
          <h3 className="font-display text-2xl font-semibold text-glow">Sign in</h3>
          <p className="mt-2 text-sm text-slate-400">
            Sign in with GitHub to keep your uploaded samples tied to your account.
          </p>
        </div>

        <a
          href={githubLoginUrl()}
          className="glass glass-hover flex items-center justify-center gap-2.5 rounded-full py-3 text-sm font-semibold text-slate-100 transition-all"
        >
          <GitHubMark />
          Continue with GitHub
        </a>

        <p className="mt-5 text-xs text-slate-500 text-center">
          You can keep using ANVESH without signing in — samples just won't be tied to an account.
        </p>
      </GlassPanel>
    </ModalShell>
  );
}
