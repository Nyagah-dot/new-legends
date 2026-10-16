"use client";

import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The <section id="classes"> wrapper. It owns the motion only; the markup and the
 * database-driven table are rendered on the server by Timetable.tsx and passed in.
 */
export default function TimetableShell({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const $ = gsap.utils.selector(el);

      const stage = $(".ltt__stage")[0] as HTMLElement | undefined;
      const bg = $(".ltt__bg")[0] as HTMLElement | undefined;
      const bgImg = $(".ltt__bg img")[0] as HTMLElement | undefined;
      const card = $(".ltt__card")[0] as HTMLElement | undefined;
      const rise = $("[data-rise]");
      const fades = $(".ltt__card [data-fade]");
      const sheet = $(".ltt__sheet")[0] as HTMLElement;
      const heads = $(".ltt__table thead th");
      const rows = $("[data-row]");

      /* small screens: open the horizontal scroller on today's column (works with or without motion) */
      const scroller = $(".ltt__scroll")[0] as HTMLElement | undefined;
      const todayHead = $(".ltt__table thead th.ltt__today")[0] as HTMLElement | undefined;
      const timeHead = $(".ltt__table thead th.ltt__time")[0] as HTMLElement | undefined;
      if (scroller && todayHead && scroller.scrollWidth > scroller.clientWidth) {
        scroller.scrollLeft = Math.max(0, todayHead.offsetLeft - (timeHead?.offsetWidth ?? 0));
      }

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        /* ---- image + card ---- */
        if (bg) gsap.set(bg, { clipPath: "inset(100% 0% 0% 0%)" });
        if (bgImg) gsap.set(bgImg, { scale: 1.25 });
        if (!stage || !card) return;
        gsap.set(card, { clipPath: "inset(100% 0% 0% 0%)" });
        gsap.set(rise, { yPercent: 115 });
        gsap.set(fades, { autoAlpha: 0, y: 20 });

        const intro = gsap.timeline({
          defaults: { ease: "expo.out" },
          scrollTrigger: { trigger: stage, start: "top 70%", once: true },
        });
        if (bg) intro.to(bg, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut" }, 0);
        if (bgImg) intro.to(bgImg, { scale: 1, duration: 1.9 }, 0.1);
        intro
          .to(card, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "expo.inOut", clearProps: "clipPath" }, 0.5)
          .to(rise, { yPercent: 0, duration: 1.1 }, 0.85)
          .to(fades, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1 }, 1.0);

        if (bgImg) {
          gsap.fromTo(
            bgImg,
            { yPercent: -6 },
            { yPercent: 6, ease: "none", scrollTrigger: { trigger: stage, start: "top bottom", end: "bottom top", scrub: true } }
          );
        }

        /* ---- table sheet: wipes up, headers then rows follow ---- */
        if (sheet) {
          gsap.set(sheet, { clipPath: "inset(100% 0% 0% 0%)" });
          gsap.set(heads, { autoAlpha: 0, y: 12 });
          gsap.set(rows, { autoAlpha: 0, y: 24 });
          gsap
            .timeline({
              defaults: { ease: "expo.out" },
              scrollTrigger: { trigger: sheet, start: "top 85%", once: true },
            })
            .to(sheet, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "expo.inOut", clearProps: "clipPath" }, 0)
            .to(heads, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.05, clearProps: "all" }, 0.5)
            .to(rows, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.09, clearProps: "all" }, 0.6);
        }
      });
    },
    { scope: root }
  );

  return (
    <section id="classes" className="ltt" ref={root}>
      {children}
    </section>
  );
}
