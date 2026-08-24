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
import Credits from "./components/layout/Credits";
import AuthModal from "./components/modals/AuthModal";
import IucnDrawer from "./components/modals/IucnDrawer";
import EndangeredModal from "./components/modals/EndangeredModal";
import LiveStatusWidget from "./components/decor/LiveStatusWidget";
import ScientificModal from "./components/modals/ScientificModal";
import { getDiscovered, getIndices, getMe, getResults, getSampleReads } from "./api/client";
import { useAppStore } from "./store/useAppStore";

// Demo sample shown on first load so the dashboard isn't a wall of empty
// states before anyone has uploaded anything — backend/main.py's stub
// returns the same canned example detections for any sample id.
const DEMO_SAMPLE_ID = 1;

export default function App() {
  const setSampleResults = useAppStore((s) => s.setSampleResults);
  const setReadsBySpecies = useAppStore((s) => s.setReadsBySpecies);
  const setDiscovered = useAppStore((s) => s.setDiscovered);
  const selectSpecies = useAppStore((s) => s.selectSpecies);
  const authToken = useAppStore((s) => s.authToken);
  const setAuth = useAppStore((s) => s.setAuth);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [results, indices, reads, discovered] = await Promise.all([
          getResults(DEMO_SAMPLE_ID),
          getIndices(DEMO_SAMPLE_ID),
          getSampleReads(DEMO_SAMPLE_ID),
          getDiscovered(DEMO_SAMPLE_ID),
        ]);
        if (cancelled) return;
        setSampleResults(DEMO_SAMPLE_ID, results.detections, indices);
        setReadsBySpecies(reads.reads_by_species);
        setDiscovered(discovered.unmatched, discovered.marker_gene);
        if (results.detections[0]) selectSpecies(results.detections[0].species);
      } catch {
        // Backend not reachable — dashboard just falls back to its empty state.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setSampleResults, setReadsBySpecies, setDiscovered, selectSpecies]);

  // Picks up a fresh session two ways: (1) `?auth_token=...` — the GitHub
  // OAuth callback in backend/main.py redirects here with one after a
  // successful login, or `?auth_error=...` if the user cancelled or GitHub
  // rejected it; (2) a token already in localStorage from a previous visit
  // (see useAppStore's authToken init) just needs its profile re-fetched,
  // since only the token itself survives a reload, not the user object.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromRedirect = params.get("auth_token");
    const authError = params.get("auth_error");

    if (tokenFromRedirect || authError) {
      params.delete("auth_token");
      params.delete("auth_error");
      const rest = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }

    if (authError) {
      console.error("GitHub login failed:", authError);
      return;
    }

    const token = tokenFromRedirect ?? authToken;
    if (!token) return;

    getMe(token)
      .then((me) => setAuth(token, { id: me.id, email: me.email, username: me.username, avatarUrl: me.avatar_url }))
      .catch(() => setAuth(null, null)); // stale/invalid token — drop it rather than stay half-logged-in
    // Only ever needs to run once per token change (redirect landing, or
    // the one stored token found on first mount) — not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div id="top" className="relative">
      <Navbar />

      <ScrollVideoHero />
      <LoopVideoSection />

      <div className="relative z-10 bg-gradient-to-b from-abyss-950 via-[#071328] via-50% to-abyss-950">
        {/* Seamless Ambient Ocean Spotlights & Caustic Light Rays */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Top Caustic Light Beam: Fills space right after loop video with luminous cyan sea glow */}
          <div className="absolute top-[2%] left-1/2 -translate-x-1/2 w-[1150px] h-[650px] bg-gradient-to-b from-sky-400/16 via-cyan-500/12 to-transparent rounded-full blur-[140px]" />

          {/* Upper Mid Deep Teal Radial: Melds into species list & index cards */}
          <div className="absolute top-[25%] left-1/3 w-[950px] h-[600px] bg-gradient-to-br from-teal-500/15 via-sky-600/10 to-transparent rounded-full blur-[150px]" />

          {/* Lower Mid Indigo-Cyan Ambient Glow: Connects middle section to shipwreck scene */}
          <div className="absolute top-[52%] right-1/4 w-[1100px] h-[700px] bg-gradient-to-tl from-indigo-500/14 via-cyan-600/15 to-transparent rounded-full blur-[160px]" />

          {/* Seafloor Transition Spotlight */}
          <div className="absolute top-[75%] left-1/2 -translate-x-1/2 w-[1250px] h-[750px] bg-cyan-900/18 rounded-full blur-[170px]" />
        </div>

        {/* Ambient Deep-Sea Rising Air Bubbles */}
        <RisingBubbles />

        {/* Hydrodynamically Accurate Translucent Jellyfish Layer */}
        <JellyfishLayer />

        {/* Full Uncut User Uploaded Background Layer (Spans lower dashboard & footer at z-0) */}
        <div aria-hidden className="pointer-events-none absolute bottom-0 inset-x-0 z-0 h-[1250px] md:h-[1500px] overflow-hidden">
          {/* Multi-Stop Extended Top Gradient Blend (Guarantees zero visible seam/line) */}
          <div className="absolute inset-x-0 top-0 z-10 h-96 md:h-[450px] bg-gradient-to-b from-[#071328] via-[#071328] via-35% via-[#071328]/85 via-65% via-[#071328]/35 via-85% to-transparent pointer-events-none" />

          {/* User Uploaded Ocean Background Artwork - Feathered Top Edge */}
          <img
            src="/creatures/user_footer_background.jpeg"
            alt="Ocean background on deep ocean floor"
            className="h-full w-full object-cover object-bottom opacity-85 filter contrast-110 saturate-115"
            style={{
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 18%, rgba(0,0,0,1) 42%)",
              maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 18%, rgba(0,0,0,1) 42%)",
            }}
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
          <GeographicMap />
          <DiscoveredReads />
          <IndexCards />
          <SimilarityMap />
        </main>

        <Credits />
      </div>

      <AuthModal />
      <IucnDrawer />
      <EndangeredModal />
      <LiveStatusWidget />
      <ScientificModal />
    </div>
  );
}

