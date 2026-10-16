"use client";

import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import CircleCta from "./CircleCta";
import { TIMETABLE_HREF } from "@/lib/site";
import { onIntro } from "@/lib/motion";
import "./Hero.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);


function Line({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className="lhero__mask">
      <span className={`lhero__line ${className}`.trim()} data-line>
        {children}
      </span>
    </span>
  );
}

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const $ = gsap.utils.selector(el);

      const lines = $("[data-line]");
      const fades = $("[data-fade]");
      const media = $(".lhero__media")[0] as HTMLElement;
      const video = $(".lhero__video")[0] as HTMLVideoElement | undefined;
      const cta = $("[data-cta]");
      const rowA = $(".lhero__row--a");
      const rowB = $(".lhero__row--b");

      const mm = gsap.matchMedia();
      mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", still: "(prefers-reduced-motion: reduce)" },
        (ctx) => {
          const { still } = ctx.conditions as { still: boolean };
          if (still) {
            video?.pause(); // reduced motion: everything stays visible
          }

          /*  initial (hidden) state  */
          gsap.set(lines, { yPercent: 118 });
          gsap.set(fades, { autoAlpha: 0, y: 24 });
          gsap.set(media, { clipPath: "inset(100% 0% 0% 0%)" });
          gsap.set(video, { scale: 1.35 });
          gsap.set(cta, { scale: 0, rotate: -90 });

          /* ---- intro: plays when the wipe is about half cleared ---- */
          const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
          tl.to(media, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut" }, 0)
            .to(video, { scale: 1, duration: 1.9 }, 0.1)
            .to(lines, { yPercent: 0, duration: 1.25, stagger: 0.1 }, 0.25)
            .to(fades, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08 }, 0.7)
            .to(cta, { scale: 1, rotate: 0, duration: 1.2, ease: "elastic.out(1,.6)" }, 1.0);
          const off = onIntro(() => tl.play());

          /* scroll: video parallax */
          if (video) {
            gsap.fromTo(
              video,
              { yPercent: -7 },
              {
                yPercent: 7,
                ease: "none",
                scrollTrigger: { trigger: media, start: "top bottom", end: "bottom top", scrub: true },
              }
            );
            ScrollTrigger.create({
              trigger: media,
              start: "top bottom",
              end: "bottom top",
              onToggle: (self) => {
                if (self.isActive) video.play().catch(() => {});
                else video.pause();
              },
            });
          }
          const drift = { ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.6 } };
          gsap.to(rowA, { xPercent: -6, ...drift });
          gsap.to(rowB, { xPercent: 6, ...drift });

          return () => off();
        }
      );

      // Fonts change line widths
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
    },
    { scope: root }
  );

  return (
    <section className="lhero" ref={root} id="top">
      <div className="lhero__gutter lhero__top">
        <p className="eyebrow" data-fade>
          Strength &amp; conditioning &middot; Nyali, Mombasa
        </p>
        <h1 className="lhero__title">
          <span className="lhero__row lhero__row--a">
            <Line>Show up.</Line> <Line className="serif i">Get to work.</Line>
          </span>
          <span className="lhero__row lhero__row--b">
            <Line>Leave</Line> <Line>tougher.</Line>
          </span>
        </h1>
      </div>

      <div className="lhero__gutter lhero__stage">
        <div className="lhero__media" aria-hidden="true">
          <div className="ph dark">
            <span className="tag">VIDEO — public/videos/hero.mp4</span>
          </div>
          <video className="lhero__video" autoPlay muted loop playsInline preload="metadata">
            <source src="/videos/hero.webm" type="video/webm" />
            <source src="/videos/hero.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      <div className="lhero__gutter lhero__foot">
        <p className="lhero__lead" data-fade>
          Real coaching and real weight for people who want to get genuinely stronger &mdash; with a
          proper on-ramp if you&rsquo;ve never trained a day in your life.
        </p>
        <div className="lhero__cta" data-cta>
          <CircleCta href={TIMETABLE_HREF} label="Book a session" ring="Book a session" size="var(--cta)" tone="red" />
        </div>
      </div>
    </section>
  );
}
