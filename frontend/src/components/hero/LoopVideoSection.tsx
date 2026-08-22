import FloatingCreatures, { LOOP_SECTION_CREATURES } from "../decor/FloatingCreatures";
import UploadSection from "../upload/UploadSection";

export default function LoopVideoSection() {
  return (
    <section id="overview" className="relative min-h-[190vh]">
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

      <FloatingCreatures placements={LOOP_SECTION_CREATURES} />

      <div className="absolute inset-0 z-10 flex flex-col items-center gap-24 px-6 pt-[15vh] pb-[18vh]">
        <div className="max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold text-glow md:text-4xl">
            One sample. A full picture of what's in the water.
          </h2>
          <p className="mt-4 text-slate-300/90">
            Gravity Falls turns raw eDNA reads into identified species, confidence scores, conservation flags and
            biodiversity metrics.
          </p>
        </div>

        <UploadSection />
      </div>
    </section>
  );
}
