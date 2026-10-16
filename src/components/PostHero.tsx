"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import "./PostHero.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** 4-point sparkle*/
function Sparkle() {
  return (
    <svg className="lpost__star" data-star viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 0C12 7 17 12 24 12C17 12 12 17 12 24C12 17 7 12 0 12C7 12 12 7 12 0Z" fill="currentColor" />
    </svg>
  );
}

/** letter animation */
function Chars({ text }: { text: string }) {
  return (
    <>
      {Array.from(text).map((c, i) =>
        c === " " ? (
          <span key={i} className="lpost__sp" />
        ) : (
          <span key={i} className="lpost__ch" data-ch>
            {c}
          </span>
        )
      )}
    </>
  );
}

export default function PostHero() {
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const rowB = useRef<HTMLSpanElement>(null);

  
  useEffect(() => {
    const t = title.current;
    const b = rowB.current;
    if (!t || !b) return;
    let lastWidth = 0;

    const fit = () => {
      const cw = t.clientWidth;
      if (!cw) return;
      const fill = window.matchMedia("(min-width: 768px)").matches ? 0.8 : 0.96;
      t.style.fontSize = "100px"; // known size
      const w = b.offsetWidth;
      if (!w) return;
      t.style.fontSize = `${(100 * cw * fill) / w}px`;
    };

    fit();
    const ro = new ResizeObserver(() => {
      const w = t.clientWidth;
      if (w !== lastWidth) {
        lastWidth = w;
        fit();
        requestAnimationFrame(() => ScrollTrigger.refresh());
      }
    });
    ro.observe(t);
    document.fonts?.ready.then(() => {
      fit();
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    return () => ro.disconnect();
  }, []);

  /* scroll-triggered*/
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const $ = gsap.utils.selector(el);
      const words = $("[data-word]");
      const chars = $("[data-ch]");
      const star = $("[data-star]");
      const rowA = $(".lpost__row--a");
      const rowBEl = $(".lpost__row--b");

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(words, { yPercent: 115 });
        gsap.set(chars, { yPercent: 125, rotate: 8, transformOrigin: "0% 100%" });
        gsap.set(star, { scale: 0, rotate: -180, autoAlpha: 0 });

        gsap
          .timeline({
            defaults: { ease: "expo.out" },
            scrollTrigger: { trigger: el, start: "top 68%", once: true },
          })
          .to(words, { yPercent: 0, duration: 1.2, stagger: 0.12 }, 0) // "Membership", "With"
          .to(star, { scale: 1, rotate: 0, autoAlpha: 1, duration: 1.2, ease: "back.out(1.7)" }, 0.35)
          .to(chars, { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.035 }, 0.45); // "Best benefits"

        // slow drift
        const drift = () => ({ trigger: el, start: "top 60%", end: "bottom top", scrub: 0.6 });
        gsap.to(rowA, { x: "5vw", ease: "none", scrollTrigger: drift() });
        gsap.to(rowBEl, { x: "-5vw", ease: "none", scrollTrigger: drift() });
      });
    },
    { scope: root }
  );

  return (
    <section className="lpost" ref={root} id="benefits">
      <div className="lpost__inner">
        <h2 className="lpost__title" ref={title} aria-label="Membership with best benefits">
          <span className="lpost__row lpost__row--a" aria-hidden="true">
            <span className="lpost__mask">
              <span className="lpost__word" data-word>Membership</span>
            </span>
          </span>
          <span className="lpost__row lpost__row--b" ref={rowB} aria-hidden="true">
            <span className="lpost__mask">
              <span className="lpost__word" data-word>With</span>
            </span>
            <Sparkle />
            <span className="lpost__mask lpost__mask--hl">
              <Chars text="Best benefits" />
            </span>
          </span>
        </h2>
      </div>
    </section>
  );
}
