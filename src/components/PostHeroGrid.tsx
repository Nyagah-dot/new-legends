"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import CircleText from "./CircleText";
import "./PostHeroGrid.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function PostHeroGrid() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const tiles = gsap.utils.toArray<HTMLElement>("[data-tile]", el);

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        tiles.forEach((tile) => {
          const img = tile.querySelector("img");
          if (!img) return;

          // reveal: wipe up + image settles from a slight zoom
          gsap.set(tile, { clipPath: "inset(100% 0% 0% 0%)" });
          gsap.set(img, { scale: 1.25 });
          gsap
            .timeline({ scrollTrigger: { trigger: tile, start: "top 85%", once: true } })
            .to(tile, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "expo.inOut" }, 0)
            .to(img, { scale: 1, duration: 1.8, ease: "expo.out" }, 0.1);

          // parallax inside the frame
          gsap.fromTo(
            img,
            { yPercent: -6 },
            {
              yPercent: 6,
              ease: "none",
              scrollTrigger: { trigger: tile, start: "top bottom", end: "bottom top", scrub: true },
            }
          );
        });
      });
    },
    { scope: root }
  );

  return (
    <section className="lgrid" ref={root} aria-label="What we offer">
      <div className="lgrid__grid">
        <div className="lgrid__tile lgrid__tile--img lgrid__tile--left" data-tile>
          <img src="/images/post-hero/left.webp" alt="Personal training session" loading="lazy" decoding="async" />
        </div>

        <div className="lgrid__tile lgrid__tile--circle lgrid__tile--a">
          <CircleText lines={["Unparalleled", "Personal training"]} href="/#coaches" />
        </div>

        <div className="lgrid__tile lgrid__tile--img lgrid__tile--right" data-tile>
          <img src="/images/post-hero/right.webp" alt="Group fitness class" loading="lazy" decoding="async" />
        </div>

        <div className="lgrid__tile lgrid__tile--circle lgrid__tile--b">
          <CircleText lines={["Unrivaled group", "Fitness classes"]} href="/#classes" />
        </div>
      </div>
    </section>
  );
}
