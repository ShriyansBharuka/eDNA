import { type CSSProperties } from "react";

type DeepSeaProp = {
  child: boolean;
}

export default function DeepSeaCreature({ child } : DeepSeaProp) {
  const outerStyle: CSSProperties & Record<"--roam-duration" | "--roam-delay", string> = {
    // Relative to the nearest positioned ancestor — LoopVideoSection's
    // content wrapper, which is sized to just its own children (heading +
    // UploadSection), not the whole page. That box measures ~1007px tall
    // there, and the upload card spans roughly 27%-87% of it, so 57%
    // centers the turtle on the card itself.
    top: child ? "62%" : "52%",
    left: child ? "7%" : "10%",
    width: child ? "100px" : "220px",
    opacity: 0.8,
    "--roam-duration": "55s",
    "--roam-delay": "-15s",
  };

  const innerStyle: CSSProperties & Record<"--bob-duration" | "--bob-delay", string> = {
    "--bob-duration": "11s",
    "--bob-delay": "-2s",
  };

  // z-30 (not the z-0 every other ambient creature uses) — at z-0 this sat
  // behind the dashboard's .glass panels (z-20), and two stacked 22px
  // backdrop-blurs (the outer GlassPanel + each card) were enough to erase
  // a 160px image completely rather than just soften it, so it was never
  // actually visible regardless of vertical position.
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {/* Majestic Bioluminescent Sea Turtle Cruising Across Deep Ocean */}
      <div className="absolute roam-right" style={outerStyle}>
        <div className="swim-turtle" style={innerStyle}>
          <img
            src="/creatures/turtle_right.png"
            alt="Bioluminescent Sea Turtle"
            className="h-auto w-full filter contrast-110 saturate-125 drop-shadow-[0_12px_28px_rgba(3,7,18,0.75)]"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
