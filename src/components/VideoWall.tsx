"use client";

import { useEffect, useRef } from "react";
import { SectionHeader } from "@/components/SectionHeader";

/**
 * A self-contained "watches in motion" section — short, muted, looping clips
 * that play only while on screen. It intentionally does NOT depend on product
 * data: the clips ship with the site (public/videos), so the section always has
 * something to show even when the live catalogue carries no per-product video.
 */
const CLIPS = [
  {
    src: "/videos/casio-3.mp4",
    poster: "/posters/casio-3.jpg",
    label: "Casio · G-Shock",
    caption: "Tough by design",
  },
  {
    src: "/videos/watch-6.mp4",
    poster: "/posters/watch-6.jpg",
    label: "Dress",
    caption: "Gold-tone glamour",
  },
  {
    src: "/videos/watch-3.mp4",
    poster: "/posters/watch-3.jpg",
    label: "Slim",
    caption: "Quietly minimal",
  },
] as const;

export function VideoWall() {
  const refs = useRef<Array<HTMLVideoElement | null>>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Play a clip only while it is on screen; pause it otherwise so we never
    // decode several videos at once off-screen (battery + data on mobile).
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const v = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) v.play().catch(() => {});
          else v.pause();
        }
      },
      { threshold: 0.4 },
    );
    for (const v of refs.current) if (v) io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <section className="band-light section-y">
      <div className="shell">
        <SectionHeader
          label="The Showroom"
          title="In Motion"
          description="A closer look — the finish, the dial, the wrist presence. Watches move the way photos can't."
        />
        <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CLIPS.map((clip, i) => (
            <div
              key={clip.src}
              className="group relative overflow-hidden rounded-3xl bg-ink shadow-product"
            >
              <div className="relative aspect-[4/5]">
                <video
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-showroom group-hover:scale-[1.03]"
                  poster={clip.poster}
                  muted
                  loop
                  playsInline
                  preload="none"
                  tabIndex={-1}
                  aria-label={`${clip.label} watch in motion`}
                >
                  <source src={clip.src} type="video/mp4" />
                </video>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <span className="eyebrow text-gold-300">{clip.label}</span>
                  <p className="mt-0.5 font-serif text-lg font-semibold text-bone">
                    {clip.caption}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
