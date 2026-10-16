"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import CircleCta from "./CircleCta";
import { headerOffset } from "@/lib/motion";
import { TIMETABLE_HREF } from "@/lib/site";
import "./Why.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ------------------------------------------------------------------
   CARDS — edit copy / order / images here only.
   Cards 1-4 are the original "why" points. Cards 5-6 are the two extra
   upsells (equipment + recovery): the copy is a PLACEHOLDER, replace
   it with what the gym really offers.
------------------------------------------------------------------- */
const CARDS = [
  { n: "01", title: "Coached, not sold to", text: "Certified strength coaches on the floor — not staff chasing commission.", img: "/images/why-legend/coach.webp", alt: "Coach demonstrating a squat" },
  { n: "02", title: "Real weight", text: "Racks, bars and space to train hard. No apologising for intensity.", img: "/images/why-legend/weights.webp", alt: "Athlete training back with heavy weights" },
  { n: "03", title: "No ego", text: "No mirrors-and-attitude culture. Everyone’s here to get better.", img: "/images/why-legend/ego.webp", alt: "Man lifting a dumbbell in low light" },
  { n: "04", title: "Beginner on-ramp", text: "Never trained? The On-Ramp teaches you the movements before you go it alone.", img: "/images/why-legend/beginner.webp", alt: "Woman doing pull-ups on a rig" },
  { n: "05", title: "Best equipment", text: "Cardio, machines and racks that are kept in shape and ready to use.", img: "/images/why-legend/equipment.webp", alt: "Row of treadmills" },
  { n: "06", title: "Recovery zone", text: "Space to stretch, roll out and reset between sessions.", img: "/images/why-legend/recovery.webp", alt: "Athletes stretching and recovering" },
] as const;

export default function Why() {
  const root = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      const railEl = rail.current;
      const trackEl = track.current;
      if (!el || !railEl || !trackEl) return;

      const cards = gsap.utils.toArray<HTMLElement>("[data-card]", el);
      const lines = gsap.utils.toArray<HTMLElement>("[data-line]", el);
      const fades = gsap.utils.toArray<HTMLElement>("[data-fade]", el);

      const mm = gsap.matchMedia();
      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          pin: "(min-width: 900px) and (hover: hover) and (pointer: fine)",
        },
        (ctx) => {
          const { motion, pin } = ctx.conditions as { motion: boolean; pin: boolean };
          if (!motion) return; // reduced motion: static layout, native swipe scroller

          /* ---- hidden start states ---- */
          gsap.set(lines, { yPercent: 115 });
          gsap.set(fades, { autoAlpha: 0, y: 24 });
          gsap.set(cards, { clipPath: "inset(100% 0% 0% 0%)" });
          gsap.set(gsap.utils.toArray("[data-img]", el), { scale: 1.3 });
          gsap.set(gsap.utils.toArray("[data-info]", el), { y: 36, autoAlpha: 0 });

          /* one card's reveal: wipe up, image settles, text rises */
          const revealTo = (tl: gsap.core.Timeline, card: HTMLElement, at: number) => {
            tl.to(card, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "expo.inOut" }, at)
              .to(card.querySelector("[data-img]"), { scale: 1, duration: 1.8, ease: "expo.out" }, at + 0.1)
              .to(card.querySelectorAll("[data-info]"), { y: 0, autoAlpha: 1, duration: 1, ease: "expo.out", stagger: 0.08 }, at + 0.5);
          };

          /* ---- desktop: pin the section, scrub the track sideways ---- */
          let scrollTween: gsap.core.Tween | undefined;
          if (pin) {
            el.classList.add("is-pinned");
            const dist = () => {
              const pad = parseFloat(getComputedStyle(railEl).paddingLeft) || 0;
              return Math.max(0, trackEl.offsetWidth + pad * 2 - railEl.clientWidth);
            };
            scrollTween = gsap.to(trackEl, {
              x: () => -dist(),
              ease: "none",
              scrollTrigger: {
                trigger: el,
                pin: true,
                start: () => `top ${headerOffset()}px`,
                end: () => `+=${dist()}`,
                scrub: 0.7,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                  if (bar.current) gsap.set(bar.current, { scaleX: self.progress });
                },
              },
            });
          }

          /* ---- entrance: heading + the cards already on screen ---- */
          const enter = gsap.timeline({
            defaults: { ease: "expo.out" },
            scrollTrigger: { trigger: el, start: "top 72%", once: true },
          });
          enter
            .to(lines, { yPercent: 0, duration: 1.2, stagger: 0.12 }, 0)
            .to(fades, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1 }, 0.25);

          let shown = 0;
          cards.forEach((card) => {
            const onScreen = card.getBoundingClientRect().left < window.innerWidth * 0.9;
            if (onScreen) {
              revealTo(enter, card, 0.35 + shown++ * 0.12);
              return;
            }
            // off-screen cards reveal as they slide / swipe into view
            const t = gsap.timeline({
              scrollTrigger: scrollTween
                ? { trigger: card, containerAnimation: scrollTween, start: "left 90%", once: true }
                : { trigger: card, scroller: railEl, horizontal: true, start: "left 92%", once: true },
            });
            revealTo(t, card, 0);
          });

          return () => el.classList.remove("is-pinned");
        }
      );
    },
    { scope: root }
  );

  return (
    <section id="about" className="lwhy" ref={root}>
      <div className="lwhy__head">
        <div>
          <span className="lwhy__eyebrow" data-fade>
            Why The <b>Legends</b>
          </span>
          <h2 className="lwhy__title" aria-label="A gym that does the work with you.">
            <span className="lwhy__mask" aria-hidden="true">
              <span className="lwhy__line" data-line>A gym that does the work</span>
            </span>
            <span className="lwhy__mask lwhy__mask--red" aria-hidden="true">
              <span className="lwhy__line" data-line>with you.</span>
            </span>
          </h2>
        </div>
        <p className="lwhy__lead" data-fade>
          Serious coaching, real weight and zero ego — with a proper way in if you’ve never trained.
        </p>
      </div>

      <div className="lwhy__rail" ref={rail} tabIndex={0} role="region" aria-label="Why The Legends — scroll sideways for more">
        <div className="lwhy__track" ref={track}>
          {CARDS.map((c) => (
            <article className="lwhy__card" key={c.n} data-card>
              <div className="lwhy__media">
                <img src={c.img} alt={c.alt} data-img decoding="async" draggable={false} />
              </div>
              <span className="lwhy__num" data-info>{c.n}</span>
              <div className="lwhy__body">
                <h3 className="lwhy__card-title" data-info>{c.title}</h3>
                <div className="lwhy__desc">
                  <p data-info>{c.text}</p>
                </div>
              </div>
            </article>
          ))}

          {/* closing card */}
          <article className="lwhy__card lwhy__card--cta" data-card>
            <div className="lwhy__cta-copy">
              <h3 className="lwhy__card-title" data-info>Your turn.</h3>
              <p data-info>Pick a class and come see for yourself.</p>
            </div>
            <div className="lwhy__cta-btn" data-info>
              <CircleCta href={TIMETABLE_HREF} label="Book a session" tone="light" appear="none" size="clamp(120px, 11vw, 168px)" />
            </div>
          </article>
        </div>
      </div>

      <div className="lwhy__foot" data-fade>
        <span className="lwhy__hint">
          <span data-when="native">Swipe</span>
          <span data-when="pin">Keep scrolling</span>
          <i aria-hidden="true">→</i>
        </span>
        <span className="lwhy__progress" aria-hidden="true">
          <span className="lwhy__bar" ref={bar} />
        </span>
      </div>
    </section>
  );
}
