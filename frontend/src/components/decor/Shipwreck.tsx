import { useMemo } from "react";

export default function Shipwreck() {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        left: `${(i * 4.5 + 2) % 96}%`,
        size: `${Math.floor(Math.random() * 6 + 3)}px`,
        duration: `${Math.floor(Math.random() * 6 + 7)}s`,
        delay: `${(i * 0.4).toFixed(1)}s`,
      })),
    []
  );

  return (
    <section aria-label="Abyssal Shipwreck & Coral Seabed" className="relative w-full overflow-hidden pt-28 pb-20 min-h-[620px] flex flex-col justify-end items-center">
      {/* Background Layer: Full-View Panoramic Ocean Floor & Coral Reef Artwork */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Top Gradient Fade: Smoothly dissolves out of the dark abyssal background above */}
        <div className="absolute inset-x-0 top-0 z-10 h-44 bg-gradient-to-b from-abyss-950 via-abyss-950/80 to-transparent" />

        {/* Ocean Floor Seabed with Corals */}
        <img
          src="/creatures/full_shipwreck_floor.png"
          alt="Submerged shipwreck and coral reef ocean floor"
          className="h-full w-full object-cover object-bottom opacity-85 filter contrast-110 saturate-125"
          loading="lazy"
        />

        {/* Bottom Fade to blend with footer below */}
        <div className="absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-abyss-950 via-abyss-950/60 to-transparent" />
      </div>

      {/* Atmospheric Volumetric Light Beams */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-96 bg-gradient-to-b from-sky-500/10 via-cyan-500/5 to-transparent blur-3xl" />

      {/* Ambient Rising Air Bubbles */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {bubbles.map((b) => (
          <div
            key={b.id}
            className="animate-bubble absolute bottom-0 rounded-full bg-cyan-200/40 backdrop-blur-sm shadow-[0_0_8px_rgba(56,189,248,0.8)]"
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

      {/* Foreground Highlight: Submerged Half-Broken Shipwreck PNG */}
      <div className="relative z-20 mx-auto flex w-full max-w-5xl flex-col items-center px-6">
        <div className="group relative flex w-full justify-center">
          {/* Bioluminescent cyan backglow around the wreck */}
          <div className="absolute -inset-6 mx-auto max-w-3xl rounded-full bg-cyan-500/15 blur-3xl transition-opacity duration-1000 group-hover:opacity-100 opacity-75" />

          <img
            src="/creatures/shipwreck.png"
            alt="Aesthetic half-broken submerged shipwreck resting on coral ocean floor"
            className="relative z-10 w-full max-w-3xl select-none object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.95)] filter contrast-110 saturate-110 transition-transform duration-700 ease-out hover:scale-[1.015]"
            loading="lazy"
          />
        </div>

        {/* Narrative Caption */}
        <div className="relative z-30 mt-6 max-w-xl text-center px-4">
          <p className="text-sm font-medium tracking-wide text-cyan-200/90 md:text-base text-glow">
            "What sinks still speaks — every sample carries traces of what came before."
          </p>
          <div className="mx-auto mt-3 h-0.5 w-20 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
        </div>
      </div>
    </section>
  );
}
