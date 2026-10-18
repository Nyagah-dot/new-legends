"use client";

import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** The <section> wrapper: owns the motion only. Markup + price come from FinalCta.tsx (server). */
export default function FinalCtaShell({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const $ = gsap.utils.selector(el);
      const bg = $(".lfc__bg")[0];
      const img = $(".lfc__bg img")[0];
      const card = $(".lfc__card")[0];
      const fades = $(".lfc__card [data-fade]");

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(bg, { clipPath: "inset(100% 0% 0% 0%)" });
        gsap.set(img, { scale: 1.25 });
        gsap.set(card, { xPercent: -100, autoAlpha: 0 });
        gsap.set(fades, { autoAlpha: 0, y: 20 });

        gsap
          .timeline({
            defaults: { ease: "expo.out" },
            scrollTrigger: { trigger: el, start: "top 65%", once: true },
          })
          .to(bg, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut" }, 0)
          .to(img, { scale: 1, duration: 1.9 }, 0.1)
          .to(card, { xPercent: 0, autoAlpha: 1, duration: 1.3 }, 0.6)
          .to(fades, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12 }, 1.3);

        /* depth: photo drifts slowly behind the card */
        gsap.fromTo(
          img,
          { yPercent: -6 },
          { yPercent: 6, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } }
        );
      });
    },
    { scope: root }
  );

  return (
    <section className="lfc" ref={root} aria-label="Join The Legends Fitness">
      {children}
    </section>
  );
}
