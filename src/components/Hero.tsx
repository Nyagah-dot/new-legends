"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import CircleCta from "./CircleCta";
import { TIMETABLE_HREF } from "@/lib/site";
import { onIntro } from "@/lib/motion";
import "./Hero.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * One line of type cut across its middle
 */
function SplitLine({ text }: { text: string }) {
  return (
    <span className="lhero__split">
      <span className="lhero__base">{text}</span>
      <span className="lhero__half lhero__half--top" data-half="top" aria-hidden="true">{text}</span>
      <span className="lhero__half lhero__half--bot" data-half="bot" aria-hidden="true">{text}</span>
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

      const tops = $("[data-half='top']");
      const bots = $("[data-half='bot']");
      const rise = $("[data-rise]");
      const media = $(".lhero__media")[0] as HTMLElement;
      const video = $(".lhero__video")[0] as HTMLVideoElement | undefined;

      const mm = gsap.matchMedia();
      mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", still: "(prefers-reduced-motion: reduce)" },
        (ctx) => {
          const { still } = ctx.conditions as { still: boolean };
          if (still) {
            el.classList.add("is-ready");
            video?.pause(); // reduced motion: static hero, video holds its first frame
            return;
          }

          /* ---- hidden start state (set before anything is shown, so there is no flash) ---- */
          gsap.set(tops, { xPercent: -18, autoAlpha: 0 });
          gsap.set(bots, { xPercent: 18, autoAlpha: 0 });
          gsap.set(rise, { yPercent: 118 });
          gsap.set(media, { clipPath: "inset(100% 0% 0% 0%)" });
          if (video) gsap.set(video, { scale: 1.35 });
          el.classList.add("is-ready"); // CSS keeps the hero hidden until this point

          /* ---- intro: plays straight away (no splash screen); waits for the font, max 0.7s ---- */
          const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
          tl.to(media, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut" }, 0);
          if (video) tl.to(video, { scale: 1, duration: 1.9 }, 0.1);
          tl.to([...tops, ...bots], { xPercent: 0, autoAlpha: 1, duration: 1.5 }, 0.25) // halves converge
            .to(rise, { yPercent: 0, duration: 1.2 }, 0.6); // orange line rises through its mask
          let dead = false;
          const start = () => {
            const fontReady = document.fonts?.ready ?? Promise.resolve();
            Promise.race([fontReady, new Promise((r) => setTimeout(r, 700))]).then(() => {
              if (!dead) tl.play();
            });
          };
          const off = onIntro(start); // fires immediately when no <PageWipe /> is mounted

          /* ---- scroll: the two halves of line 1 slide apart ---- */
          const st = () => ({ trigger: el, start: "top top", end: "bottom top", scrub: 0.6 });
          gsap.to(tops, { x: "-8vw", ease: "none", scrollTrigger: st() });
          gsap.to(bots, { x: "8vw", ease: "none", scrollTrigger: st() });

          /* ---- scroll: video parallax, paused when off-screen ---- */
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

          return () => {
            dead = true;
            off();
          };
        }
      );

      // The condensed font changes line widths; re-measure once it lands.
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
    },
    { scope: root }
  );

  return (
    <section className="lhero" ref={root} id="top">
      <noscript>
        <style>{`.lhero :is(.lhero__title,.lhero__media,.lhero__cta){visibility:visible!important}`}</style>
      </noscript>
      <div className="lhero__top">
        <h1 className="lhero__title">
          <span className="lhero__line lhero__line--a">
            <SplitLine text={"It\u2019s not fitness."} />
          </span>
          <span className="lhero__line lhero__line--b">
            <span className="lhero__mask">
              <span className="lhero__rise" data-rise>
                It&rsquo;s life.
              </span>
            </span>
          </span>
        </h1>
      </div>

      <div className="lhero__stage">
        <div className="lhero__media" aria-hidden="true">
          <video className="lhero__video" autoPlay muted loop playsInline preload="metadata" poster="/videos/hero-poster.jpg">
            <source src="/videos/hero.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Mounts itself (scale + opacity) once the page wipe clears. */}
        <div className="lhero__cta">
          <CircleCta href={TIMETABLE_HREF} label="Book a session" size="var(--cta)" appear="intro" delay={1} />
        </div>
      </div>
    </section>
  );
}