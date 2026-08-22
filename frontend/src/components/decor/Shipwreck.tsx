import { useMemo } from "react";

export default function Shipwreck() {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: `${(i * 5.8 + 2) % 96}%`,
        size: `${Math.floor(Math.random() * 6 + 3)}px`,
        duration: `${Math.floor(Math.random() * 6 + 7)}s`,
        delay: `${(i * 0.5).toFixed(1)}s`,
      })),
    []
  );

  return (
    <section aria-label="Abyssal Floor & Shipwreck" className="relative w-full overflow-hidden bg-abyss-950 pt-12 pb-0">
      {/* Top Gradient Fade: Seamless transition from dark abyss into sandy ocean floor */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-20 h-40 bg-gradient-to-b from-abyss-950 via-abyss-950/90 to-transparent" />

      {/* Atmospheric Light Beams filtering from above */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-96 bg-gradient-to-b from-sky-500/10 via-cyan-500/5 to-transparent blur-3xl" />

      {/* Ocean Floor Seabed Background Image */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="/creatures/ocean_floor.png"
          alt=""
          className="h-full w-full object-cover object-bottom opacity-65 filter contrast-110 saturate-120"
          loading="lazy"
        />
        {/* Soft shadow vignette to keep text readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-abyss-950 via-abyss-950/40 to-transparent" />
      </div>

      {/* Ambient Rising Air Bubbles */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {bubbles.map((b) => (
          <div
            key={b.id}
            className="animate-bubble absolute bottom-0 rounded-full bg-cyan-200/35 shadow-[0_0_6px_rgba(56,189,248,0.7)]"
            style={{
              left: b.left,
              width: b.size,
              height: b.size,
              "--bubble-duration": b.duration,
              "--bubble-delay": b.delay,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Submerged Half-Broken Shipwreck */}
      <div className="relative z-20 mx-auto flex w-full max-w-5xl flex-col items-center px-6 pt-8 pb-12">
        <div className="group relative flex w-full justify-center">
          {/* Soft ambient backlight around wreck */}
          <div className="absolute -inset-4 mx-auto max-w-3xl rounded-full bg-cyan-500/10 blur-3xl" />

          <img
            src="/creatures/shipwreck.png"
            alt="Aesthetic half-broken submerged shipwreck resting on the ocean floor"
            className="relative z-10 w-full max-w-3xl select-none object-contain drop-shadow-[0_16px_30px_rgba(0,0,0,0.9)] filter contrast-105 saturate-105 transition-transform duration-700 ease-out hover:scale-[1.01]"
            loading="lazy"
          />
        </div>

        {/* Narrative & Depth Tag */}
        <div className="relative z-30 mt-6 max-w-xl text-center px-4">
          <p className="text-sm font-medium tracking-wide text-cyan-200/90 md:text-base text-glow">
            "What sinks still speaks — every sample carries traces of what came before."
          </p>
          <div className="mx-auto my-4 h-0.5 w-16 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-abyss-950/80 px-4 py-1.5 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-semibold tracking-wider text-cyan-300/90 uppercase">
              Abyssal Seafloor Zone • 3,000m Depth
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
