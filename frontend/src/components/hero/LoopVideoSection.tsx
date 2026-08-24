import UploadSection from "../upload/UploadSection";
import DeepSeaCreature from "../decor/DeepSeaCreature";

export default function LoopVideoSection() {
  return (
    <section id="overview" className="relative min-h-[135vh] w-full">
      {/* Sticky Background Video Layer */}
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

      {/* Content Container: Positioned relatively so height naturally fits UploadSection without overlap */}
      <div className="relative z-10 -mt-[100vh] flex flex-col items-center gap-12 px-6 pt-20 pb-32">
        {/* Cruising past the upload card specifically, per request — this
            div's own box (not the full-page one in App.tsx anymore) is
            what `top: %` in DeepSeaCreature is relative to. */}
        <DeepSeaCreature child={false} />
        <DeepSeaCreature child={true} />

        <div className="max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold text-glow md:text-4xl">
            One sample. A full picture of what's in the water.
          </h2>
          <p className="mt-4 text-slate-300/90">
            ANVESH turns raw eDNA reads into identified species, confidence scores, conservation flags and
            biodiversity metrics.
          </p>
        </div>

        <UploadSection />
      </div>
    </section>
  );
}
