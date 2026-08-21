import GlassPanel from "../ui/GlassPanel";
import type { PanelShape } from "../ui/GlassPanel";

interface Feature {
  title: string;
  body: string;
  shape: PanelShape;
}

const FEATURES: Feature[] = [
  {
    title: "Ensemble Classifier Router",
    body: "Classical marker-gene tools (12S / 16S / COI) vote together, with a router trusting whichever tool fits each marker best.",
    shape: "blob-a",
  },
  {
    title: "BarcodeBERT Deep Classifier",
    body: "A barcode-pretrained Transformer plus a custom self-attention + BiLSTM head calls species straight from raw DNA.",
    shape: "hex",
  },
  {
    title: "Genetic Similarity Map",
    body: "Uncertain sequences aren't forced into a guess — they're shown as a node on a map of genetic closeness to known species.",
    shape: "wave",
  },
  {
    title: "Conservation-Aware Dashboard",
    body: "Every detection is cross-checked against IUCN Red List status and the Wildlife Protection Act, flagged automatically.",
    shape: "blob-b",
  },
  {
    title: "Biodiversity Indices",
    body: "Shannon diversity, species richness, and evenness — computed straight from per-species read counts.",
    shape: "angled",
  },
  {
    title: "Geographic Distribution",
    body: "Click a species to see its recorded sightings plotted on an OpenStreetMap world view, GBIF-sourced.",
    shape: "blob-c",
  },
];

export default function LoopVideoSection() {
  return (
    <section id="overview" className="relative min-h-[340vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          src="/loop.mp4"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-abyss-950/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-abyss-950/40 via-transparent to-abyss-950" />
      </div>

      <div className="absolute inset-0 z-10 flex flex-col items-center gap-28 px-6 pt-[16vh] pb-[20vh]">
        <div className="max-w-2xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-glow">
            One sample. A full picture of what's in the water.
          </h2>
          <p className="mt-4 text-slate-300/90">
            AquaVigil turns raw eDNA reads into identified species, confidence scores, conservation flags, and
            biodiversity indices — keep scrolling for what's under the hood.
          </p>
        </div>

        {FEATURES.map((f) => (
          <GlassPanel key={f.title} shape={f.shape} className="max-w-xl p-8 md:p-10">
            <h3 className="font-display text-xl font-semibold text-glow-400" style={{ color: "#7dd3fc" }}>
              {f.title}
            </h3>
            <p className="mt-3 text-slate-300/90 text-sm md:text-base">{f.body}</p>
          </GlassPanel>
        ))}
      </div>
    </section>
  );
}
