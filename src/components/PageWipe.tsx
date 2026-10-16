
"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

import Brand from "./Brand";
import { fireIntro, introDone } from "@/lib/motion";
import "./PageWipe.css";

gsap.registerPlugin(useGSAP);

export default function PageWipe() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      // Skip the intro if it has already played or
      // the visitor prefers reduced motion.
      if (
        introDone() ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        gsap.set(el, { display: "none" });
        fireIntro();
        return;
      }

      const inner = el.querySelectorAll(".wipe__inner");

      const tl = gsap.timeline();

      tl.fromTo(
        inner,
        {
          yPercent: 110,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.85,
          stagger: 0.08,
          ease: "expo.out",
        }
      )
        // Let the brand settle before revealing the page.
        .to({}, { duration: 0.45 })
        // One panel. One continuous upward wipe.
        .to(el, {
          yPercent: -100,
          duration: 1.15,
          ease: "power3.inOut",
        })
        .call(fireIntro)
        .set(el, { display: "none" });
    },
    { scope: root }
  );

  return (
    <div className="wipe" ref={root} aria-hidden="true">
      <div className="wipe__content">
        <span className="wipe__mask">
          <span className="wipe__brand wipe__inner">
            <Brand />
          </span>
        </span>

        <span className="wipe__mask">
          <span className="wipe__sub wipe__inner">
            Nyali <span aria-hidden="true">·</span> Mombasa
          </span>
        </span>
      </div>

      <noscript>
        <style>{`.wipe { display: none !important; }`}</style>
      </noscript>
    </div>
  );
}
