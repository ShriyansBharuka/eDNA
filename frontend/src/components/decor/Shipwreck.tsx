// A quiet, cinematic close to the dashboard scroll — real wreck photo
// (Wikimedia Commons), pre-feathered to a soft radial fade so it blends
// straight into the page background with no hard edges.
export default function Shipwreck() {
  return (
    <section className="relative flex w-full flex-col items-center overflow-hidden py-10">
      <img
        src="/creatures/shipwreck.webp"
        alt="A wreck resting on the seafloor, encrusted with growth after years underwater"
        className="w-full max-w-4xl select-none opacity-95"
        loading="lazy"
      />
      <p className="mt-4 max-w-xl px-6 text-center text-sm italic text-slate-400/80 md:text-base">
        What sinks still speaks — every sample carries traces of what came before.
      </p>
    </section>
  );
}
