import { useAppStore } from "../../store/useAppStore";
import Gauge from "../ui/Gauge";
import GlassPanel from "../ui/GlassPanel";
import type { PanelShape } from "../ui/GlassPanel";

const SHAPES: PanelShape[] = ["blob-a", "hex", "blob-c"];

export default function IndexCards() {
  const indices = useAppStore((s) => s.indices);

  const richness = indices?.richness ?? 0;
  const shannon = indices?.shannon_index ?? 0;
  const evenness = indices?.evenness ?? 0;

  const cards = [
    {
      shape: SHAPES[0],
      gauge: { value: richness, max: Math.max(richness, 10), label: "Species Richness", sublabel: "Distinct species detected in this sample", color: "#38bdf8" },
    },
    {
      shape: SHAPES[1],
      gauge: { value: shannon, max: Math.max(shannon, 3), label: "Shannon Index", sublabel: "Diversity accounting for abundance & evenness", color: "#7dd3fc" },
    },
    {
      shape: SHAPES[2],
      gauge: { value: evenness, max: 1, label: "Evenness", sublabel: "How uniformly reads are spread across species", color: "#5eead4" },
    },
  ];

  return (
    <section id="indices" className="scroll-mt-28">
      <h3 className="font-display text-2xl font-semibold text-glow mb-6">Biodiversity Indices</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {cards.map((c) => (
          <GlassPanel key={c.gauge.label} shape={c.shape} className="p-6 flex items-center justify-center">
            <Gauge {...c.gauge} />
          </GlassPanel>
        ))}
      </div>
    </section>
  );
}
