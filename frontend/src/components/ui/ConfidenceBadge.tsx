export default function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const tier =
    confidence >= 0.8 ? { label: "High", color: "#4ade80" } : confidence >= 0.5 ? { label: "Medium", color: "#fbbf24" } : { label: "Low", color: "#f87171" };

  return (
    <div className="flex items-center gap-2 w-32">
      <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${pct}%`, background: tier.color, boxShadow: `0 0 8px ${tier.color}aa` }}
        />
      </div>
      <span className="text-xs tabular-nums text-slate-300 w-10 text-right">{pct}%</span>
    </div>
  );
}
