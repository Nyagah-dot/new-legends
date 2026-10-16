"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { COACHES } from "@/lib/coaches";
import { TIMETABLE_HREF } from "@/lib/site";
import "./CoachesGrid.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function CoachesGrid() {
  const root = useRef<HTMLElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  /* ---- scroll reveal: row by row, wipe up + image settles ---- */
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const cards = gsap.utils.toArray<HTMLElement>(".lcg__card", el);

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(cards, { clipPath: "inset(100% 0% 0% 0%)" });
        gsap.set(el.querySelectorAll(".lcg__media img"), { scale: 1.2 });

        ScrollTrigger.batch(cards, {
          start: "top 88%",
          once: true,
          onEnter: (batch) => {
            gsap.to(batch, {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: 1.3,
              ease: "expo.inOut",
              stagger: 0.12,
              clearProps: "clipPath",
            });
            gsap.to(
              batch.map((c) => (c as HTMLElement).querySelector("img")),
              { scale: 1, duration: 1.8, ease: "expo.out", stagger: 0.12 }
            );
          },
        });
      });
    },
    { scope: root }
  );

  /* ---- touch: tap a card to open / close its details; Esc closes ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tapToggle = (id: string) => {
    if (window.matchMedia("(hover: none)").matches) setOpenId((p) => (p === id ? null : id));
  };

  return (
    <section className="lcg" id="coach-team" ref={root} aria-label="Our coaches">
      <div className="lcg__grid">
        {COACHES.map((c) => (
          <article
            key={c.id}
            className="lcg__card"
            tabIndex={0}
            data-open={openId === c.id}
            onClick={() => tapToggle(c.id)}
          >
            <div className="lcg__media">
              <img src={c.image} alt={c.alt} loading="lazy" decoding="async" />
            </div>

            {/* resting label, bottom-left */}
            <div className="lcg__label">
              <h3 className="lcg__name">{c.name}</h3>
              <p className="lcg__role">{c.role}</p>
              <span className="lcg__bio">
                Bio
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" aria-hidden="true">
                  <path d="M4 12h16M14 6l6 6-6 6" />
                </svg>
              </span>
            </div>

            {/* hover / focus / tap reveal */}
            <div className="lcg__panel">
              <p className="lcg__panel-role">{c.role}</p>
              <h3 className="lcg__panel-name">{c.name}</h3>
              <p className="lcg__blurb">{c.blurb}</p>

              <div className="lcg__block">
                <h4>Areas of expertise</h4>
                <ul>
                  {c.expertise.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>

              <div className="lcg__block">
                <h4>Coaching style</h4>
                <ul>
                  {c.style.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>

              <Link href={TIMETABLE_HREF} className="lcg__book" onClick={(e) => e.stopPropagation()}>
                Book a session
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" aria-hidden="true">
                  <path d="M4 12h16M14 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
