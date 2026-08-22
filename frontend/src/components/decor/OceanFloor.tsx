import { useMemo } from "react";

export default function OceanFloor() {
  const seabedParticles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: `${(i * 5 + 3) % 96}%`,
        bottom: `${Math.floor(Math.random() * 80 + 10)}px`,
        size: `${Math.floor(Math.random() * 6 + 3)}px`,
        opacity: (Math.random() * 0.5 + 0.3).toFixed(2),
        duration: `${Math.floor(Math.random() * 4 + 3)}s`,
      })),
    []
  );

  return (
    <div aria-label="Abyssal Seafloor" className="relative w-full overflow-hidden bg-abyss-950 pt-8 pb-16">
      {/* Sandy Ocean Floor Background Image & Gradient Blend */}
      <div className="relative w-full h-64 md:h-80 overflow-hidden">
        {/* Top Gradient Blend from abyssal black to seabed */}
        <div className="absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-abyss-950 via-abyss-950/80 to-transparent" />

        {/* Ocean Floor Seabed Image */}
        <img
          src="/creatures/ocean_floor.png"
          alt="Deep sea ocean floor with coral reefs and bioluminescent flora"
          className="h-full w-full object-cover object-bottom opacity-75 filter contrast-110 saturate-125"
          loading="lazy"
        />

        {/* Bottom Ambient Glow & Shadow Mask */}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950 via-cyan-950/30 to-transparent" />

        {/* Bioluminescent Micro-Particles Floating Near Seabed */}
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          {seabedParticles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(125,211,252,0.9)] animate-pulse"
              style={{
                left: p.left,
                bottom: p.bottom,
                width: p.size,
                height: p.size,
                opacity: Number(p.opacity),
                animationDuration: p.duration,
              }}
            />
          ))}
        </div>
      </div>

      {/* Ocean Floor Badge / Details */}
      <div className="relative z-20 -mt-10 text-center px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-slate-950/80 px-4 py-1.5 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.2)]">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-semibold tracking-wider text-cyan-300 uppercase">
            Abyssal Seafloor Zone • 3,000m Depth
          </span>
        </div>
      </div>
    </div>
  );
}
