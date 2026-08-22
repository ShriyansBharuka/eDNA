import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useAppStore } from "../../store/useAppStore";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollVideoHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const setHeroDone = useAppStore((s) => s.setHeroDone);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    let trigger: ScrollTrigger | undefined;
    // A seek is async (the browser fires 'seeking' then 'seeked'). Firing a
    // new video.currentTime write on every scroll tick queues seeks faster
    // than the browser can resolve them, which is its own source of lag on
    // top of decode cost. Instead: track only the latest requested time, and
    // only ever have one seek in flight — when it resolves, jump straight to
    // wherever the scroll is *now* rather than working through a backlog.
    let latestTarget = 0;
    let seeking = false;

    const applySeek = () => {
      if (seeking || !video.duration) return;
      if (Math.abs(video.currentTime - latestTarget) <= 0.01) return;
      seeking = true;
      video.currentTime = latestTarget;
    };

    const onSeeked = () => {
      seeking = false;
      applySeek();
    };
    video.addEventListener("seeked", onSeeked);

    const setup = () => {
      trigger?.kill();
      trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=3500",
        pin: true,
        scrub: 0.2,
        anticipatePin: 1,
        onUpdate: (self) => {
          if (!video.duration) return;
          latestTarget = self.progress * video.duration;
          applySeek();
        },
        onLeave: () => setHeroDone(true),
        onEnterBack: () => setHeroDone(false),
      });
    };

    if (video.readyState >= 1) {
      setup();
    } else {
      video.addEventListener("loadedmetadata", setup, { once: true });
    }

    return () => {
      trigger?.kill();
      video.removeEventListener("loadedmetadata", setup);
      video.removeEventListener("seeked", onSeeked);
    };
  }, [setHeroDone]);

  return (
    <section ref={sectionRef} className="relative h-screen w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        src="/opening.mp4"
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-abyss-950/85" />

      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center text-center px-6 pointer-events-none">
        <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight text-glow">Gravity Falls</h1>
        <p className="mt-3 max-w-xl text-slate-300/90 text-sm md:text-base">
          eDNA marine species intelligence — scroll to descend.
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-2 text-slate-300/80">
        <span className="text-xs uppercase tracking-[0.3em]">Scroll to dive in</span>
        <span className="h-8 w-5 rounded-full border border-slate-400/50 flex items-start justify-center p-1">
          <span className="h-1.5 w-1.5 rounded-full bg-glow-400 animate-drift" />
        </span>
      </div>

      {/* SIH Logo - Shifted Slightly Right */}
      <img
        src="/SIH-logo.png"
        alt="Smart India Hackathon Logo"
        className="absolute bottom-14 sm:bottom-16 right-24 sm:right-36 z-20 h-[68px] md:h-[86px] w-auto pointer-events-none object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]"
      />
    </section>
  );
}
