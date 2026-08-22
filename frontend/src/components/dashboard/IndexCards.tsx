import { useAppStore } from "../../store/useAppStore";
import Gauge from "../ui/Gauge";
import GlassPanel from "../ui/GlassPanel";

export default function IndexCards() {
  const indices = useAppStore((s) => s.indices);

  const richness = indices?.richness ?? 0;
  const shannon = indices?.shannon_index ?? 0;
  const evenness = indices?.evenness ?? 0;

  const cards = [
    {
      value: richness,
      max: Math.max(richness, 10),
      label: "Species Richness",
      sublabel: "Distinct species detected in this sample",
      color: "#38bdf8",
    },
    {
      value: shannon,
      max: Math.max(shannon, 3),
      label: "Shannon Index",
      sublabel: "Diversity accounting for abundance & evenness",
      color: "#7dd3fc",
    },
    {
      value: evenness,
      max: 1,
      label: "Evenness",
      sublabel: "How uniformly reads are spread across species",
      color: "#5eead4",
    },
  ];

  return (
    <section id="assessment" className="scroll-mt-28">
      <h3 className="mb-6 font-display text-2xl font-semibold text-glow">Biodiversity Assessment</h3>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {cards.map((c) => (
          // One shared silhouette across all three: the cards sit side by side,
          // so matching shapes keep the glass border and hover glow reading as
          // a single consistent set.
          <GlassPanel key={c.label} shape="round" className="flex items-center justify-center p-6">
            <Gauge {...c} />
          </GlassPanel>
        ))}
      </div>
    </section>
  );
}
