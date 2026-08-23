import { type CSSProperties } from "react";

export default function DeepSeaCreature() {
  const outerStyle: CSSProperties & Record<"--roam-duration" | "--roam-delay", string> = {
    top: "38%",
    width: "160px",
    opacity: 0.8,
    "--roam-duration": "55s",
    "--roam-delay": "-15s",
  };

  const innerStyle: CSSProperties & Record<"--bob-duration" | "--bob-delay", string> = {
    "--bob-duration": "11s",
    "--bob-delay": "-2s",
  };

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
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
