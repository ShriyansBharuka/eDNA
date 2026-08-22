import { useEffect } from "react";
import Navbar from "./components/layout/Navbar";
import ScrollVideoHero from "./components/hero/ScrollVideoHero";
import LoopVideoSection from "./components/hero/LoopVideoSection";
import SpeciesList from "./components/dashboard/SpeciesList";
import IndexCards from "./components/dashboard/IndexCards";
import GeographicMap from "./components/dashboard/GeographicMap";
import SimilarityMap from "./components/dashboard/SimilarityMap";
import DiscoveredReads from "./components/dashboard/DiscoveredReads";
import FloatingCreatures from "./components/decor/FloatingCreatures";
import RisingBubbles from "./components/decor/RisingBubbles";
import JellyfishLayer from "./components/decor/JellyfishLayer";
import DeepSeaCreature from "./components/decor/DeepSeaCreature";
import Credits from "./components/layout/Credits";
import AuthModal from "./components/modals/AuthModal";
import IucnDrawer from "./components/modals/IucnDrawer";
import EndangeredModal from "./components/modals/EndangeredModal";
import { getIndices, getResults } from "./api/client";
import { useAppStore } from "./store/useAppStore";

// Demo sample shown on first load so the dashboard isn't a wall of empty
// states before anyone has uploaded anything — backend/main.py's stub
// returns the same canned example detections for any sample id.
const DEMO_SAMPLE_ID = 1;

export default function App() {
  const setSampleResults = useAppStore((s) => s.setSampleResults);
  const selectSpecies = useAppStore((s) => s.selectSpecies);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [results, indices] = await Promise.all([getResults(DEMO_SAMPLE_ID), getIndices(DEMO_SAMPLE_ID)]);
        if (cancelled) return;
        setSampleResults(DEMO_SAMPLE_ID, results.detections, indices);
        if (results.detections[0]) selectSpecies(results.detections[0].species);
      } catch {
        // Backend not reachable — dashboard just falls back to its empty state.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setSampleResults, selectSpecies]);

  return (
    <div id="top" className="relative">
      <Navbar />

      <ScrollVideoHero />
      <LoopVideoSection />

      <div className="relative z-10 bg-gradient-to-b from-abyss-950 via-slate-950 to-abyss-950">
        {/* Ambient Underwater Spotlights and Deep Blue Radials */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-cyan-900/15 rounded-full blur-[140px]" />
          <div className="absolute top-[30%] left-1/4 w-[750px] h-[480px] bg-sky-900/15 rounded-full blur-[130px]" />
          <div className="absolute top-[55%] right-1/4 w-[800px] h-[500px] bg-indigo-950/25 rounded-full blur-[150px]" />
          <div className="absolute top-[78%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-cyan-950/30 rounded-full blur-[160px]" />
        </div>

        {/* Ambient Deep-Sea Rising Air Bubbles */}
        <RisingBubbles />

        {/* Hydrodynamically Accurate Translucent Jellyfish Layer */}
        <JellyfishLayer />

        {/* Deep-Sea Cruising Sea Turtle */}
        <DeepSeaCreature />

        {/* Full Uncut Dark Sunken Shipwreck Background Layer (Spans lower dashboard & footer at z-0) */}
        <div aria-hidden className="pointer-events-none absolute bottom-0 inset-x-0 z-0 h-[1100px] md:h-[1350px] overflow-hidden">
          {/* Smooth Top Gradient Blend: Seamlessly dissolves out of the dark abyssal background above */}
          <div className="absolute inset-x-0 top-0 z-10 h-48 bg-gradient-to-b from-abyss-950 via-abyss-950/80 to-transparent" />

          {/* Cinematic Dark Sunken Shipwreck Artwork - Full Uncut View */}
          <img
            src="/creatures/dark_sunken_shipwreck_footer.png"
            alt="Cinematic dark sunken shipwreck on deep ocean floor"
            className="h-full w-full object-cover object-bottom opacity-85 filter contrast-110 saturate-110"
            loading="lazy"
          />

          {/* Soft Vignette Overlay: Ensures cards & maps remain 100% crisp and readable */}
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-abyss-950/90 via-abyss-950/30 to-transparent" />
        </div>

        {/* <FloatingCreatures /> */}

        <main className="relative z-20 mx-auto max-w-6xl px-6 pb-16 pt-6 flex flex-col gap-10 sm:gap-12">
          <section id="species" className="scroll-mt-28">
            <SpeciesList />
          </section>
          <IndexCards />
          <DiscoveredReads />
          <GeographicMap />
          <SimilarityMap />
        </main>

        <Credits />
      </div>

      <AuthModal />
      <IucnDrawer />
      <EndangeredModal />
    </div>
  );
}

