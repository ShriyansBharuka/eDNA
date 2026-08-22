import type { CSSProperties } from "react";

type CreatureId = "clownfish" | "bluetang" | "turtle" | "jellyfish" | "octopus" | "manta" | "shark" | "whaleshark";

function getCreatureImage(kind: CreatureId, dir: "left" | "right"): string {
  if (kind === "jellyfish") return "/creatures/jellyfish.png";
  const base = kind === "bluetang" ? "clownfish" : kind === "whaleshark" ? "shark" : kind;
  return `/creatures/${base}_${dir}.png`;
}

const SWIM_CLASS: Record<CreatureId, string> = {
  jellyfish: "swim-jellyfish",
  octopus: "swim-octopus",
  clownfish: "swim-fish",
  bluetang: "swim-fish",
  turtle: "swim-turtle",
  manta: "swim-turtle",
  shark: "swim-shark",
  whaleshark: "swim-shark",
};

export interface CreaturePlacement {
  kind: CreatureId;
  top: string;
  dir: "left" | "right";
  size: number;
  opacity: number;
  roam: string;
  bob: string;
  delay: string;
}

// Biologically proportioned sizes & randomized depth placements:
export const DASHBOARD_CREATURES: CreaturePlacement[] = [
  { kind: "whaleshark", top: "2%", dir: "right", size: 240, opacity: 0.45, roam: "88s", bob: "15s", delay: "-14s" },
  { kind: "octopus", top: "7%", dir: "left", size: 130, opacity: 0.55, roam: "72s", bob: "8.5s", delay: "-28s" },
  { kind: "manta", top: "15%", dir: "left", size: 190, opacity: 0.5, roam: "76s", bob: "13s", delay: "-42s" },
  { kind: "turtle", top: "22%", dir: "right", size: 160, opacity: 0.52, roam: "64s", bob: "11s", delay: "-19s" },
  { kind: "clownfish", top: "29%", dir: "left", size: 54, opacity: 0.6, roam: "52s", bob: "5.2s", delay: "-8s" },
  { kind: "jellyfish", top: "36%", dir: "left", size: 92, opacity: 0.55, roam: "94s", bob: "7.5s", delay: "-33s" },
  { kind: "shark", top: "44%", dir: "right", size: 215, opacity: 0.45, roam: "70s", bob: "14s", delay: "-58s" },
  { kind: "octopus", top: "52%", dir: "right", size: 135, opacity: 0.55, roam: "78s", bob: "8.5s", delay: "-22s" },
  { kind: "bluetang", top: "60%", dir: "right", size: 50, opacity: 0.6, roam: "56s", bob: "5.8s", delay: "-15s" },
  { kind: "turtle", top: "68%", dir: "left", size: 155, opacity: 0.5, roam: "68s", bob: "12s", delay: "-49s" },
  { kind: "jellyfish", top: "76%", dir: "right", size: 88, opacity: 0.55, roam: "86s", bob: "8s", delay: "-12s" },
  { kind: "manta", top: "84%", dir: "right", size: 185, opacity: 0.48, roam: "74s", bob: "13.5s", delay: "-38s" },
  { kind: "clownfish", top: "92%", dir: "left", size: 56, opacity: 0.6, roam: "50s", bob: "4.8s", delay: "-24s" },
];

export const LOOP_SECTION_CREATURES: CreaturePlacement[] = [
  { kind: "whaleshark", top: "5%", dir: "left", size: 230, opacity: 0.45, roam: "84s", bob: "15s", delay: "-10s" },
  { kind: "turtle", top: "18%", dir: "right", size: 150, opacity: 0.5, roam: "62s", bob: "11s", delay: "-38s" },
  { kind: "octopus", top: "32%", dir: "left", size: 125, opacity: 0.55, roam: "74s", bob: "8.5s", delay: "-24s" },
  { kind: "jellyfish", top: "46%", dir: "right", size: 90, opacity: 0.55, roam: "92s", bob: "8s", delay: "-52s" },
  { kind: "shark", top: "59%", dir: "right", size: 210, opacity: 0.45, roam: "70s", bob: "14s", delay: "-16s" },
  { kind: "clownfish", top: "72%", dir: "left", size: 52, opacity: 0.6, roam: "51s", bob: "5s", delay: "-33s" },
  { kind: "bluetang", top: "84%", dir: "right", size: 48, opacity: 0.6, roam: "55s", bob: "5.5s", delay: "-6s" },
  { kind: "turtle", top: "94%", dir: "left", size: 145, opacity: 0.5, roam: "65s", bob: "12s", delay: "-45s" },
];

interface FloatingCreaturesProps {
  placements?: CreaturePlacement[];
}

export default function FloatingCreatures({ placements = DASHBOARD_CREATURES }: FloatingCreaturesProps) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10 hidden overflow-hidden xl:block">
      {placements.map((c, i) => {
        const goingLeft = c.dir === "left";
        const swimAnimClass = SWIM_CLASS[c.kind] || "swim-fish";
        const imageSrc = getCreatureImage(c.kind, c.dir);

        const outerStyle: CSSProperties & Record<"--roam-duration" | "--roam-delay", string> = {
          top: c.top,
          left: 0,
          width: c.size,
          "--roam-duration": c.roam,
          "--roam-delay": c.delay,
        };
        const innerStyle: CSSProperties & Record<"--bob-duration" | "--bob-delay", string> = {
          opacity: c.opacity,
          "--bob-duration": c.bob,
          "--bob-delay": c.delay,
        };

        return (
          <div key={i} className={`absolute ${goingLeft ? "roam-left" : "roam-right"}`} style={outerStyle}>
            <div className={swimAnimClass} style={innerStyle}>
              <img
                src={imageSrc}
                alt=""
                className="h-auto w-full filter contrast-105 saturate-110 drop-shadow-[0_12px_24px_rgba(3,7,18,0.7)] transition-all duration-300"
                loading="lazy"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

