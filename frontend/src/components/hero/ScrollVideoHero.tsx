import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../store/useAppStore";

export default function ScrollVideoHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const forwardVideoRef = useRef<HTMLVideoElement>(null);
  const reverseVideoRef = useRef<HTMLVideoElement>(null);
  const setHeroDone = useAppStore((s) => s.setHeroDone);

  const [activeVideo, setActiveVideo] = useState<"forward" | "reverse">("forward");

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let hasScrolledDownOnce = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isDone = !entry.isIntersecting;
        setHeroDone(isDone);

        if (isDone) {
          hasScrolledDownOnce = true;
        }

        // When user scrolls back UP into hero section after having scrolled down:
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && hasScrolledDownOnce) {
          hasScrolledDownOnce = false;
          setActiveVideo("reverse");
          if (reverseVideoRef.current) {
            reverseVideoRef.current.currentTime = 0;
            reverseVideoRef.current.play().catch(() => {});
          }
        }
      },
      { threshold: [0.3, 0.5, 0.8] }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [setHeroDone]);

  const handleReverseEnded = () => {
    // Seamless dual-player transition from reverse to forward (zero black flash)
    setActiveVideo("forward");
    if (forwardVideoRef.current) {
      forwardVideoRef.current.currentTime = 0;
      forwardVideoRef.current.play().catch(() => {});
    }
  };

  const handleForwardEnded = () => {
    // Forward video complete -> smooth scroll down to next section
    const nextSection = document.getElementById("overview");
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
    }
  };

  return (
    <section ref={sectionRef} className="relative h-screen w-full overflow-hidden bg-black">
      {/* Forward Video Layer */}
      <video
        ref={forwardVideoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        src="/opening.mp4"
        onEnded={handleForwardEnded}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
          activeVideo === "forward" ? "opacity-100 z-10" : "opacity-0 z-0"
        }`}
      />

      {/* Reverse Video Layer (Pre-buffered for seamless 0ms transition) */}
      <video
        ref={reverseVideoRef}
        muted
        playsInline
        preload="auto"
        src="/opening.reverse.mp4"
        onEnded={handleReverseEnded}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
          activeVideo === "reverse" ? "opacity-100 z-10" : "opacity-0 z-0"
        }`}
      />

      {/* Ambient Top & Bottom Gradient Vignette Overlay */}
      <div className="absolute inset-0 z-20 bg-gradient-to-b from-black/50 via-transparent to-abyss-950/85 pointer-events-none" />

      {/* Hero Title */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center text-center px-6 pointer-events-none z-30">
        <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight text-glow">ANVESH</h1>
        <p className="mt-3 max-w-xl text-slate-300/90 text-sm md:text-base">
          eDNA marine species intelligence.
        </p>
      </div>
    </section>
  );
}
