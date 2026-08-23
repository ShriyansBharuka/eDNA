import { useMemo, type CSSProperties } from "react";

export interface JellyfishPlacement {
  id: number;
  image: string;
  left: string;
  size: number;
  opacity: number;
  roamSpeed: string;
  roamDelay: string;
  pulseSpeed: string;
  pulseDelay: string;
  filter: string;
}

export default function JellyfishLayer() {
  const jellies = useMemo<JellyfishPlacement[]>(
    () => [
      {
        id: 1,
        image: "/creatures/jellyfish.png",
        left: "10%",
        size: 105,
        opacity: 0.65,
        roamSpeed: "65s",
        roamDelay: "-8s",
        pulseSpeed: "7.2s",
        pulseDelay: "-1.5s",
        filter: "drop-shadow(0 0 14px rgba(56,189,248,0.45))",
      },
      {
        id: 2,
        image: "/creatures/jellyfish_comb.png",
        left: "28%",
        size: 90,
        opacity: 0.68,
        roamSpeed: "78s",
        roamDelay: "-34s",
        pulseSpeed: "8.0s",
        pulseDelay: "-4.2s",
        filter: "drop-shadow(0 0 16px rgba(168,85,247,0.4))",
      },
      {
        id: 3,
        image: "/creatures/jellyfish.png",
        left: "48%",
        size: 118,
        opacity: 0.7,
        roamSpeed: "58s",
        roamDelay: "-18s",
        pulseSpeed: "6.8s",
        pulseDelay: "-0.9s",
        filter: "hue-rotate(170deg) drop-shadow(0 0 18px rgba(45,212,191,0.45))",
      },
      {
        id: 4,
        image: "/creatures/jellyfish_comb.png",
        left: "68%",
        size: 100,
        opacity: 0.66,
        roamSpeed: "72s",
        roamDelay: "-42s",
        pulseSpeed: "7.6s",
        pulseDelay: "-2.8s",
        filter: "drop-shadow(0 0 16px rgba(125,211,252,0.45))",
      },
      {
        id: 5,
        image: "/creatures/jellyfish.png",
        left: "86%",
        size: 110,
        opacity: 0.68,
        roamSpeed: "84s",
        roamDelay: "-52s",
        pulseSpeed: "8.2s",
        pulseDelay: "-3.5s",
        filter: "hue-rotate(40deg) drop-shadow(0 0 14px rgba(14,165,233,0.4))",
      },
    ],
    []
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {jellies.map((j) => {
        const outerStyle: CSSProperties & Record<"--jelly-roam-speed" | "--jelly-roam-delay", string> = {
          left: j.left,
          width: j.size,
          "--jelly-roam-speed": j.roamSpeed,
          "--jelly-roam-delay": j.roamDelay,
        };

        const innerStyle: CSSProperties & Record<"--jelly-pulse-speed" | "--jelly-delay", string> = {
          opacity: j.opacity,
          "--jelly-pulse-speed": j.pulseSpeed,
          "--jelly-delay": j.pulseDelay,
        };

        return (
          <div key={j.id} className="absolute roam-jellyfish-upward" style={outerStyle}>
            <div className="swim-jellyfish-accurate" style={innerStyle}>
              <img
                src={j.image}
                alt=""
                className="h-auto w-full transition-all duration-300"
                style={{ filter: j.filter }}
                loading="lazy"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
