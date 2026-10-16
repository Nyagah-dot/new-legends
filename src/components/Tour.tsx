"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import SectionHeader from "./SectionHeader";
import RectCta from "./RectCta";
import { TIMETABLE_HREF } from "@/lib/site";
import "./Tour.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);


const PHOTOS = [
  { src: "/images/gallery/1.webp", alt: "Inside The Legends Fitness — the floor" },
  { src: "/images/gallery/2.webp", alt: "Inside The Legends Fitness" },
  { src: "/images/gallery/3.webp", alt: "Inside The Legends Fitness" },
  { src: "/images/gallery/4.webp", alt: "Inside The Legends Fitness" },
  { src: "/images/gallery/5.webp", alt: "Inside The Legends Fitness" },
  { src: "/images/gallery/6.webp", alt: "Inside The Legends Fitness" },
  { src: "/images/gallery/7.webp", alt: "Inside The Legends Fitness" },
  { src: "/images/gallery/8.webp", alt: "Inside The Legends Fitness" },
  { src: "/images/gallery/9.webp", alt: "Inside The Legends Fitness" },
  { src: "/images/gallery/10.webp", alt: "Inside The Legends Fitness" },
];

export default function Tour() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const tiles = gsap.utils.toArray<HTMLElement>("[data-tile]", el);

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        /* start states: alternate wipe direction  */
        tiles.forEach((t, i) => {
          gsap.set(t, { clipPath: i % 2 ? "inset(0% 0% 0% 100%)" : "inset(100% 0% 0% 0%)", y: 40 });
          gsap.set(t.querySelector("[data-img]"), { scale: 1.4 });
        });

        /* mount: tiles reveal in batches */
        ScrollTrigger.batch(tiles, {
          start: "top 92%",
          once: true,
          interval: 0.12,
          batchMax: 5,
          onEnter: (batch) => {
            gsap.to(batch, {
              clipPath: "inset(0% 0% 0% 0%)",
              y: 0,
              duration: 1.3,
              ease: "expo.inOut",
              stagger: 0.1,
              overwrite: true,
            });
            gsap.to(
              batch.map((t) => t.querySelector("[data-img]")),
              { scale: 1, duration: 1.9, ease: "expo.out", stagger: 0.1, delay: 0.1 }
            );
          },
        });

        /* depth: photo drifts */
        tiles.forEach((t) => {
          gsap.fromTo(
            t.querySelector("[data-img]"),
            { yPercent: -5 },
            {
              yPercent: 5,
              ease: "none",
              scrollTrigger: { trigger: t, start: "top bottom", end: "bottom top", scrub: true },
            }
          );
        });
      });
    },
    { scope: root }
  );

  return (
    <section id="tour" className="lt" ref={root}>
      <div className="lt__wrap">
        <SectionHeader
          className="lt__head"
          tone="light"
          rule
          eyebrow="Quick look around"
          lines={[{ text: "Everything you need." }, { text: "Nothing you don’t.", accent: true }]}
        />

        <div className="lt__grid">
          {PHOTOS.map((p, i) => (
            <figure className="lt__tile" key={p.src} data-tile>
              <div className="lt__zoom">
                <img src={p.src} alt={p.alt} data-img decoding="async" loading={i < 4 ? "eager" : "lazy"} draggable={false} />
              </div>
            </figure>
          ))}
        </div>

        <div className="lt__foot">
          <RectCta href={TIMETABLE_HREF} label="Come see the real thing" tone="ink" />
        </div>
      </div>
    </section>
  );
}
