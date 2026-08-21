import Navbar from "./components/layout/Navbar";
import ScrollVideoHero from "./components/hero/ScrollVideoHero";
import LoopVideoSection from "./components/hero/LoopVideoSection";
import SpeciesList from "./components/dashboard/SpeciesList";
import IndexCards from "./components/dashboard/IndexCards";
import GeographicMap from "./components/dashboard/GeographicMap";
import SimilarityMap from "./components/dashboard/SimilarityMap";
import UploadModal from "./components/modals/UploadModal";
import AuthModal from "./components/modals/AuthModal";
import IucnDrawer from "./components/modals/IucnDrawer";

export default function App() {
  return (
    <div id="top" className="relative">
      <Navbar />

      <ScrollVideoHero />
      <LoopVideoSection />

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-32 pt-20 flex flex-col gap-24 bg-abyss-950">
        <section id="species" className="scroll-mt-28">
          <SpeciesList />
        </section>
        <IndexCards />
        <GeographicMap />
        <SimilarityMap />
      </main>

      <UploadModal />
      <AuthModal />
      <IucnDrawer />
    </div>
  );
}
