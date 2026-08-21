import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import GlassPanel from "../ui/GlassPanel";
import ModalShell from "./ModalShell";

export default function AuthModal() {
  const open = useAppStore((s) => s.authOpen);
  const setOpen = useAppStore((s) => s.setAuthOpen);
  const [tab, setTab] = useState<"login" | "signup">("login");

  const close = () => setOpen(false);

  return (
    <ModalShell open={open} onClose={close}>
      <GlassPanel shape="round" hover={false} className="p-8">
        <div className="flex gap-2 mb-6">
          {(["login", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`glass glass-hover flex-1 rounded-full py-2 text-sm font-medium capitalize ${
                tab === t ? "text-glow-400" : "text-slate-400"
              }`}
              style={tab === t ? { color: "#7dd3fc", borderColor: "rgba(125,211,252,0.6)" } : undefined}
            >
              {t}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            close();
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-2">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-glow-500/60"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-2">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-glow-500/60"
            />
          </div>

          <button
            type="submit"
            className="glass glass-hover rounded-full py-2.5 text-sm font-medium mt-2"
            style={{ color: "#7dd3fc", borderColor: "rgba(125,211,252,0.5)" }}
          >
            {tab === "login" ? "Log in" : "Create account"}
          </button>
          <p className="text-xs text-slate-500 text-center">
            Authentication isn't wired up yet — this is a placeholder UI.
          </p>
        </form>
      </GlassPanel>
    </ModalShell>
  );
}
