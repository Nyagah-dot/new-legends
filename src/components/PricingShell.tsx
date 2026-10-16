"use client";

import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The <section id="pricing"> wrapper. Owns the motion only; markup and the
 * database-driven plans are rendered on the server by Pricing.tsx.
 */
export default function PricingShell({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const $ = gsap.utils.selector(el);

      const hero = $(".lpr__hero")[0] as HTMLElement | undefined;
      const media = $(".lpr__media")[0] as HTMLElement | undefined;
      const video = $(".lpr__video")[0] as HTMLVideoElement | undefined;
      const card = $(".lpr__card")[0] as HTMLElement | undefined;
      const burst = $(".lpr__burst")[0] as HTMLElement | undefined;
      const shape = $(".lpr__burstShape")[0] as HTMLElement | undefined;
      const rise = $(".lpr__hero [data-rise]");
      const fades = $(".lpr__hero [data-fade]");
      const plans = $(".lpr__plans")[0] as HTMLElement | undefined;
      const rise2 = $("[data-rise2]");
      const fades2 = $("[data-fade2]");
      const cards = $("[data-card]");

      /* video only plays while visible (all motion preferences) */
      if (hero && video) {
        ScrollTrigger.create({
          trigger: hero,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => {
            if (self.isActive) video.play().catch(() => {});
            else video.pause();
          },
        });
      }

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        /* ---- hero ---- */
        if (hero && media && card) {
          gsap.set(media, { clipPath: "inset(100% 0% 0% 0%)" });
          if (video) gsap.set(video, { scale: 1.25 });
          gsap.set(card, { yPercent: 101 });
          gsap.set(rise, { yPercent: 115 });
          gsap.set(fades, { autoAlpha: 0, y: 20 });
          if (burst) gsap.set(burst, { scale: 0, rotation: -40, autoAlpha: 0 });

          const tl = gsap.timeline({
            defaults: { ease: "expo.out" },
            scrollTrigger: { trigger: hero, start: "top 70%", once: true },
          });
          tl.to(media, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut" }, 0);
          if (video) tl.to(video, { scale: 1, duration: 1.9 }, 0.1);
          tl.to(card, { yPercent: 0, duration: 1.2 }, 0.55)
            .to(rise, { yPercent: 0, duration: 1.1 }, 0.85)
            .to(fades, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1 }, 1.0);
          if (burst) {
            tl.to(burst, { scale: 1, rotation: 0, autoAlpha: 1, duration: 1.4, ease: "elastic.out(1,.55)", clearProps: "transform" }, 1.15);
          }

          if (video) {
            gsap.fromTo(
              video,
              { yPercent: -6 },
              { yPercent: 6, ease: "none", scrollTrigger: { trigger: hero, start: "top bottom", end: "bottom top", scrub: true } }
            );
          }
        }

        /* ---- the starburst spins slowly, only while on screen ---- */
        if (hero && shape) {
          const spin = gsap.to(shape, { rotation: 360, duration: 26, ease: "none", repeat: -1, paused: true });
          ScrollTrigger.create({
            trigger: hero,
            start: "top bottom",
            end: "bottom top",
            onToggle: (self) => (self.isActive ? spin.play() : spin.pause()),
          });
        }

        /* ---- plans: heading rises, cards wipe up one after another ---- */
        if (plans) {
          gsap.set(rise2, { yPercent: 115 });
          gsap.set(fades2, { autoAlpha: 0, y: 16 });
          gsap.set(cards, { clipPath: "inset(100% 0% 0% 0%)", y: 36 });

          gsap
            .timeline({ defaults: { ease: "expo.out" }, scrollTrigger: { trigger: plans, start: "top 72%", once: true } })
            .to(fades2, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1 }, 0)
            .to(rise2, { yPercent: 0, duration: 1.1, stagger: 0.12 }, 0.1)
            .to(cards, { clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 1.1, stagger: 0.1, clearProps: "clipPath,transform" }, 0.45);
        }
      });
    },
    { scope: root }
  );

  return (
    <section id="pricing" className="lpr" ref={root}>
      {children}
    </section>
  );
}
