import { useMemo } from "react";

export default function RisingBubbles() {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: `${(i * 3.3 + 1.5) % 97}%`,
        size: `${Math.floor(Math.random() * 7 + 4)}px`,
        speed: `${(Math.random() * 8 + 10).toFixed(1)}s`,
        delay: `-${(Math.random() * 15).toFixed(1)}s`,
        opacity: (Math.random() * 0.45 + 0.3).toFixed(2),
      })),
    []
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="animate-rising-bubble absolute bottom-0 rounded-full border border-cyan-300/40 bg-cyan-200/25 backdrop-blur-[1px] shadow-[0_0_8px_rgba(56,189,248,0.65)]"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            opacity: Number(b.opacity),
            "--bubble-speed": b.speed,
            "--bubble-delay": b.delay,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
