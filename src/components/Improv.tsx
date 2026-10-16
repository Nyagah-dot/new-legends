"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import CircleText from "./CircleText";
import CircleCta from "./CircleCta";
import "./Improv.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);


const VIDEO_SRC = "/videos/improv.mp4";
const CIRCLE_LINES = ["Get better", "every single", "session"]; // placeholder copy
const JOIN_HREF = "/#pricing";

export default function Improv() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const zoom = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const circleWrap = useRef<HTMLDivElement>(null);
  const ctaWrap = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const st = stage.current;
      const fr = frame.current;
      const zm = zoom.current;
      const vid = video.current;
      if (!st || !fr || !zm || !vid) return;

      const mm = gsap.matchMedia();

      /* ---- motion allowed ---- */
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        /* mount: frame wipes up, footage settles from a zoom */
        gsap.set(fr, { clipPath: "inset(100% 0% 0% 0%)" });
        gsap.set(zm, { scale: 1.3 });

        gsap
          .timeline({
            defaults: { ease: "expo.out" },
            scrollTrigger: { trigger: st, start: "top 92%", once: true },
          })
          .to(fr, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut" }, 0)
          .to(zm, { scale: 1, duration: 2, ease: "expo.out" }, 0.1);

        /* scrub: three depths — footage drifts slowest, circle + CTA float faster */
        const scrub = { trigger: st, start: "top bottom", end: "bottom top", scrub: 0.8 };
        gsap.fromTo(vid, { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: scrub });
        gsap.fromTo(circleWrap.current, { y: 70 }, { y: -70, ease: "none", scrollTrigger: scrub });
        gsap.fromTo(ctaWrap.current, { y: 40 }, { y: -40, ease: "none", scrollTrigger: scrub });

        /* only play while on screen */
        const play = ScrollTrigger.create({
          trigger: fr,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => {
            if (self.isActive) vid.play().catch(() => {});
            else vid.pause();
          },
        });
        return () => play.kill();
      });

      /* ---- reduced motion: show a still frame, no autoplay ---- */
      mm.add("(prefers-reduced-motion: reduce)", () => {
        vid.removeAttribute("autoplay");
        vid.pause();
        const still = () => {
          vid.currentTime = 0.1;
        };
        vid.addEventListener("loadedmetadata", still);
        return () => vid.removeEventListener("loadedmetadata", still);
      });
    },
    { scope: root }
  );

  return (
    <section id="improv" className="limp" ref={root} aria-label="Train with us">
      <div className="limp__stage" ref={stage}>
        <div className="limp__frame" ref={frame}>
          <div className="limp__zoom" ref={zoom}>
            <video
              ref={video}
              className="limp__media"
              src={VIDEO_SRC}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              disablePictureInPicture
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>
        </div>

        <div className="limp__circle" ref={circleWrap}>
          <CircleText lines={CIRCLE_LINES} tone="ink" appear="scroll" delay={0.4} />
        </div>

        <div className="limp__cta" ref={ctaWrap}>
          <CircleCta
            href={JOIN_HREF}
            label="Join now"
            size="var(--limp-cta)"
            appear="scroll"
            delay={0.2}
            // icon={<span className="limp__plus" aria-hidden="true">[+]</span>}
          />
        </div>
      </div>
    </section>
  );
}
