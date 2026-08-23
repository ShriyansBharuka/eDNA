import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../store/useAppStore";

export default function ScrollVideoHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const setHeroDone = useAppStore((s) => s.setHeroDone);

  // Tracks whether video is playing forward ("/opening.mp4") or native reverse ("/opening.reverse.mp4")
  const [videoSrc, setVideoSrc] = useState("/opening.mp4");
  const isReversingRef = useRef(false);

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

        // When user scrolls back UP to hero after having scrolled down:
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && hasScrolledDownOnce) {
          hasScrolledDownOnce = false;
          isReversingRef.current = true;
          setVideoSrc("/opening.reverse.mp4");
        }
      },
      { threshold: [0.3, 0.5, 0.8] }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [setHeroDone]);

  // Handle video completion
  const handleVideoEnded = () => {
    if (isReversingRef.current) {
      // Reversing phase complete! Now switch to forward playback
      isReversingRef.current = false;
      setVideoSrc("/opening.mp4");
    } else {
      // Forward playback complete! Smooth scroll to next section
      const nextSection = document.getElementById("overview");
      if (nextSection) {
        nextSection.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
      }
    }
  };

  return (
    <section ref={sectionRef} className="relative h-screen w-full overflow-hidden bg-black">
      {/* 60 FPS Native Hardware-Accelerated Video Player */}
      <video
        key={videoSrc}
        ref={videoRef}
        autoPlay
        muted
        playsInline
        src={videoSrc}
        onEnded={handleVideoEnded}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-abyss-950/85" />

      {/* Hero Title */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center text-center px-6 pointer-events-none z-10">
        <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight text-glow">Gravity Falls</h1>
        <p className="mt-3 max-w-xl text-slate-300/90 text-sm md:text-base">
          eDNA marine species intelligence — scroll to descend.
        </p>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-2 text-slate-300/80 z-10 pointer-events-none">
        <span className="text-xs uppercase tracking-[0.3em]">Scroll to dive in</span>
        <span className="h-8 w-5 rounded-full border border-slate-400/50 flex items-start justify-center p-1">
          <span className="h-1.5 w-1.5 rounded-full bg-glow-400 animate-drift" />
        </span>
      </div>
    </section>
  );
}
