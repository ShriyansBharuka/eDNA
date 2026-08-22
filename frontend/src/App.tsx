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
import Shipwreck from "./components/decor/Shipwreck";
import Credits from "./components/layout/Credits";
import AuthModal from "./components/modals/AuthModal";
import IucnDrawer from "./components/modals/IucnDrawer";
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

      <div className="relative z-10 bg-abyss-950">
        <FloatingCreatures />
        <main className="relative mx-auto max-w-6xl px-6 pb-32 pt-20 flex flex-col gap-24">
          <section id="species" className="scroll-mt-28">
            <SpeciesList />
          </section>
          <IndexCards />
          <DiscoveredReads />
          <GeographicMap />
          <SimilarityMap />
        </main>
        <Shipwreck />
        <Credits />
      </div>

      <AuthModal />
      <IucnDrawer />
    </div>
  );
}
