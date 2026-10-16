"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import "./CoachesHero.css";
import RectCta from "./RectCta";
gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function CoachesHero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const $ = gsap.utils.selector(el);
      const media = $(".lch__media")[0] as HTMLElement;
      const video = $(".lch__video")[0] as HTMLVideoElement | undefined;
      const card = $(".lch__card")[0] as HTMLElement;
      const rise = $("[data-rise]");
      const fades = $("[data-fade]");

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(media, { clipPath: "inset(100% 0% 0% 0%)" });
        if (video) gsap.set(video, { scale: 1.25 });
        gsap.set(card, { yPercent: 101 });
        gsap.set(rise, { yPercent: 115 });
        gsap.set(fades, { autoAlpha: 0, y: 20 });

        const tl = gsap.timeline({
          defaults: { ease: "expo.out" },
          scrollTrigger: { trigger: el, start: "top 70%", once: true },
        });
        tl.to(media, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut" }, 0);
        if (video) tl.to(video, { scale: 1, duration: 1.9 }, 0.1);
        tl.to(card, { yPercent: 0, duration: 1.2 }, 0.55) // card rises from the bottom edge
          .to(rise, { yPercent: 0, duration: 1.1 }, 0.85)
          .to(fades, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1 }, 1.0);

        if (video) {
          gsap.fromTo(
            video,
            { yPercent: -6 },
            { yPercent: 6, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } }
          );
        }
      });

      // Video only plays while visible (all motion preferences).
      if (video) {
        ScrollTrigger.create({
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => {
            if (self.isActive) video.play().catch(() => {});
            else video.pause();
          },
        });
      }
    },
    { scope: root }
  );

  return (
    <section className="lch" id="coaches" ref={root}>
      <div className="lch__media" aria-hidden="true">
        <video className="lch__video" autoPlay muted loop playsInline preload="metadata">
          <source src="/videos/coachesbg.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="lch__card">
        <h2 className="lch__title">
          <span className="lch__mask">
            <span data-rise>Coaches</span>
          </span>
        </h2>
        <p className="lch__text" data-fade>
          Real coaching and real weight, from people who care whether you get stronger. Meet the team in your corner.
        </p>
        {/* <a href="#coach-team" className="lch__link" data-fade>
          Meet our coaches
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" aria-hidden="true">
            <path d="M4 12h16M14 6l6 6-6 6" />
          </svg>
        </a> */}
        <div data-fade>
          <RectCta href="#coach-team" label="Meet our coaches" tone="red" appear="none" />
      </div>
      </div>
    </section>
  );
}
