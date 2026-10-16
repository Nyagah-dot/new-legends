"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import Brand from "./Brand";
import { fireIntro, introDone } from "@/lib/motion";
import "./PageWipe.css";

gsap.registerPlugin(useGSAP);

/**
 * Page-opening "wipe up" reveal. Server-rendered covering the screen (so there is
 * no flash of un-animated content), then two panels wipe upward. Halfway through it
 * fires the intro event that the Hero (and any later section) waits for.
 * Mount once, at the top of page.tsx.
 */
export default function PageWipe() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      // Reduced motion, or already played this visit (client-side nav back home): skip.
      if (introDone() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(el, { display: "none" });
        fireIntro();
        return;
      }

      const ink = el.querySelector(".wipe__panel--ink");
      const red = el.querySelector(".wipe__panel--red");
      const inner = el.querySelectorAll(".wipe__inner");

      const tl = gsap.timeline();
      tl.fromTo(inner, { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: "expo.out", stagger: 0.08 }, 0.1)
        .addLabel("out", "+=0.35")
        .to(inner, { yPercent: -110, duration: 0.5, ease: "expo.in", stagger: 0.04 }, "out")
        .to(ink, { yPercent: -100, duration: 1.05, ease: "expo.inOut" }, "out+=0.1")
        .to(red, { yPercent: -100, duration: 1.05, ease: "expo.inOut" }, "out+=0.22")
        .call(fireIntro, [], "out+=0.7")
        .set(el, { display: "none" });
    },
    { scope: root }
  );

  return (
    <div className="wipe" ref={root} aria-hidden="true">
      <div className="wipe__panel wipe__panel--red" />
      <div className="wipe__panel wipe__panel--ink">
        <div>
          <span className="wipe__mask">
            <span className="wipe__brand wipe__inner">
              <Brand />
            </span>
          </span>
          <span className="wipe__mask">
            <span className="wipe__sub wipe__inner">Nyali &middot; Mombasa</span>
          </span>
        </div>
      </div>
      {/* If JS is off the cover must never trap the page */}
      <noscript>
        <style>{`.wipe{display:none}`}</style>
      </noscript>
    </div>
  );
}
