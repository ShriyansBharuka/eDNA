import type { CSSProperties } from "react";

// Real marine-life photos (Wikimedia Commons, background removed locally),
// floating in the wide empty gutters beside the dashboard's centered content
// column. Purely decorative (aria-hidden, pointer-events none) — hidden
// below `xl` since there's no real margin to float in on narrower screens.

type CreatureId = "clownfish" | "bluetang" | "turtle" | "jellyfish" | "manta" | "shark" | "whaleshark";

const IMAGE: Record<CreatureId, string> = {
  clownfish: "/creatures/clownfish.webp",
  bluetang: "/creatures/bluetang.webp",
  turtle: "/creatures/turtle.webp",
  jellyfish: "/creatures/jellyfish.webp",
  manta: "/creatures/manta.webp",
  shark: "/creatures/shark.webp",
  whaleshark: "/creatures/whaleshark.webp",
};

export interface CreaturePlacement {
  kind: CreatureId;
  top: string;
  side: "left" | "right";
  edgeOffset: string;
  size: number;
  opacity: number;
  duration: string;
  delay: string;
  flip?: boolean;
}

export const DASHBOARD_CREATURES: CreaturePlacement[] = [
  { kind: "whaleshark", top: "2%", side: "left", edgeOffset: "-3rem", size: 210, opacity: 0.85, duration: "24s", delay: "-2s" },
  { kind: "manta", top: "8%", side: "right", edgeOffset: "-2rem", size: 175, opacity: 0.85, duration: "20s", delay: "-9s", flip: true },
  { kind: "turtle", top: "15%", side: "right", edgeOffset: "1rem", size: 125, opacity: 0.9, duration: "17s", delay: "-6s" },
  { kind: "clownfish", top: "21%", side: "left", edgeOffset: "0.5rem", size: 105, opacity: 0.92, duration: "13s", delay: "-4s", flip: true },
  { kind: "shark", top: "29%", side: "right", edgeOffset: "-1.5rem", size: 185, opacity: 0.82, duration: "22s", delay: "-5s" },
  { kind: "jellyfish", top: "36%", side: "left", edgeOffset: "1rem", size: 105, opacity: 0.88, duration: "9s", delay: "-3s" },
  { kind: "bluetang", top: "44%", side: "right", edgeOffset: "0.5rem", size: 100, opacity: 0.9, duration: "12s", delay: "-8s", flip: true },
  { kind: "turtle", top: "51%", side: "left", edgeOffset: "-1rem", size: 115, opacity: 0.85, duration: "19s", delay: "-6s", flip: true },
  { kind: "whaleshark", top: "58%", side: "right", edgeOffset: "-2.5rem", size: 195, opacity: 0.8, duration: "25s", delay: "-13s", flip: true },
  { kind: "jellyfish", top: "65%", side: "left", edgeOffset: "0.5rem", size: 92, opacity: 0.85, duration: "10s", delay: "-2s" },
  { kind: "manta", top: "72%", side: "right", edgeOffset: "-1rem", size: 160, opacity: 0.82, duration: "21s", delay: "-12s" },
  { kind: "clownfish", top: "79%", side: "left", edgeOffset: "1rem", size: 100, opacity: 0.9, duration: "13s", delay: "-7s" },
  { kind: "shark", top: "86%", side: "right", edgeOffset: "0.5rem", size: 170, opacity: 0.82, duration: "23s", delay: "-4s", flip: true },
  { kind: "bluetang", top: "93%", side: "left", edgeOffset: "-0.5rem", size: 95, opacity: 0.88, duration: "11s", delay: "-10s" },
  { kind: "turtle", top: "98%", side: "right", edgeOffset: "1.5rem", size: 110, opacity: 0.85, duration: "18s", delay: "-9s", flip: true },
];

// Narrower column (the loop section's feature cards are max-w-xl, not the
// dashboard's max-w-6xl) — same idea, a lighter touch next to a marketing
// section rather than a data-dense one.
export const LOOP_SECTION_CREATURES: CreaturePlacement[] = [
  { kind: "whaleshark", top: "4%", side: "right", edgeOffset: "-2rem", size: 190, opacity: 0.8, duration: "24s", delay: "-4s", flip: true },
  { kind: "turtle", top: "16%", side: "left", edgeOffset: "-0.5rem", size: 115, opacity: 0.88, duration: "18s", delay: "-2s" },
  { kind: "manta", top: "29%", side: "right", edgeOffset: "0.5rem", size: 155, opacity: 0.82, duration: "20s", delay: "-8s", flip: true },
  { kind: "jellyfish", top: "42%", side: "left", edgeOffset: "1rem", size: 98, opacity: 0.85, duration: "9s", delay: "-3s" },
  { kind: "shark", top: "55%", side: "right", edgeOffset: "-1rem", size: 175, opacity: 0.8, duration: "22s", delay: "-6s" },
  { kind: "clownfish", top: "68%", side: "left", edgeOffset: "0rem", size: 100, opacity: 0.9, duration: "13s", delay: "-5s" },
  { kind: "bluetang", top: "80%", side: "right", edgeOffset: "1rem", size: 95, opacity: 0.88, duration: "11s", delay: "-9s", flip: true },
  { kind: "turtle", top: "92%", side: "left", edgeOffset: "-1rem", size: 108, opacity: 0.85, duration: "17s", delay: "-11s", flip: true },
];

interface FloatingCreaturesProps {
  placements?: CreaturePlacement[];
  /** Half-width, in rem, of the centered content column these float beside. */
  columnRem?: number;
}

export default function FloatingCreatures({ placements = DASHBOARD_CREATURES, columnRem = 72 }: FloatingCreaturesProps) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden xl:block">
      {placements.map((c, i) => {
        const isJelly = c.kind === "jellyfish";
        const style: CSSProperties & Record<"--swim-duration" | "--swim-delay", string> = {
          top: c.top,
          [c.side]: `calc((100% - ${columnRem}rem) / 2 + ${c.edgeOffset})`,
          width: c.size,
          opacity: c.opacity,
          transform: c.flip ? "scaleX(-1)" : undefined,
          "--swim-duration": c.duration,
          "--swim-delay": c.delay,
        };
        return (
          <div key={i} className={`absolute ${isJelly ? "drift-gentle" : "swim"}`} style={style}>
            <img
              src={IMAGE[c.kind]}
              alt=""
              className="h-auto w-full drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]"
              style={{ filter: "saturate(1.05) contrast(1.03)" }}
              loading="lazy"
            />
          </div>
        );
      })}
    </div>
  );
}
