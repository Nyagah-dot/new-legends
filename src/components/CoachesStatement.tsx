"use client";

import { Fragment, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import "./CoachesStatement.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** *Asterisks* mark phrases that finish in the theme red. */
const COPY =
  "At The Legends Fitness, our coaches are not just instructors they are the *reason you keep showing up*, and the difference between simply training and getting results.";

function Words() {
  return (
    <>
      {COPY.split("*").map((chunk, i) =>
        chunk.split(/(\s+)/).map((tok, j) =>
          /^\s*$/.test(tok) ? (
            tok ? <Fragment key={`${i}-${j}`}> </Fragment> : null
          ) : (
            <span key={`${i}-${j}`} className={`lcs__w${i % 2 ? " lcs__w--hl" : ""}`} data-w>
              {tok}
            </span>
          )
        )
      )}
    </>
  );
}

export default function CoachesStatement() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const words = gsap.utils.toArray<HTMLElement>("[data-w]", el);
      const text = el.querySelector(".lcs__text");

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        el.classList.add("is-armed"); // switches words to the masked-gradient fill

        // a soft gradient front sweeps through the words as you scroll
        gsap.fromTo(
          words,
          { backgroundPositionX: "100%" },
          {
            backgroundPositionX: "0%",
            ease: "none",
            duration: 1,
            stagger: 0.12,
            scrollTrigger: { trigger: text, start: "top 80%", end: "bottom 50%", scrub: true },
          }
        );
        return () => el.classList.remove("is-armed");
      });
    },
    { scope: root }
  );

  return (
    <section className="lcs" ref={root} aria-label="About our coaches">
      <div className="lcs__inner">
        <p className="lcs__text">
          <Words />
        </p>
      </div>
    </section>
  );
}
