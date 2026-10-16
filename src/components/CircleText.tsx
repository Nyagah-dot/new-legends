"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import PixelText from "./PixelText";
import { onIntro } from "@/lib/motion";
import "./CircleText.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Props = {
  /** Each entry is one line of text inside the circle. */
  lines: string[];
  /** Optional link: the circle fills red on hover. Omit for a static circle. */
  href?: string;
  tone?: "charcoal" | "ink" | "red";
  appear?: "scroll" | "intro" | "none";
  /** Extra seconds before the circle mounts (text follows ~0.5s later). */
  delay?: number;
  className?: string;
};

/**
 * Reusable "circle + text": fills its parent's width as a perfect circle, mounts by
 * scaling in, then the text resolves from pixels (see PixelText).
 */
export default function CircleText({
  lines,
  href,
  tone = "charcoal",
  appear = "scroll",
  delay = 0,
  className = "",
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const disc = useRef<HTMLElement>(null);

  useGSAP(() => {
    const node = disc.current;
    const box = wrap.current;
    if (!node || !box || appear === "none") return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.set(node, { scale: 0, autoAlpha: 0 });

    const play = () => {
      gsap.to(node, {
        scale: 1,
        duration: 1,
        ease: "expo.out",
        delay,
      });

      gsap.to(node, {
        autoAlpha: 1,
        duration: 0.5,
        ease: "power2.out",
        delay,
      });
    };
      if (appear === "intro") return onIntro(play);
      const st = ScrollTrigger.create({ trigger: box, start: "top 88%", once: true, onEnter: play });
      return () => st.kill();
    });
  });

  const text = (
    <PixelText as="p" className="ct__text" appear={appear} delay={delay + 0.5} trigger={wrap}>
      {lines.map((l) => (
        <span key={l} className="ct__line">
          {l}
        </span>
      ))}
    </PixelText>
  );

  return (
    <div ref={wrap} className={`ct ct--${tone} ${className}`.trim()}>
      {href ? (
        <Link href={href} className="ct__disc ct__disc--link" ref={disc as React.Ref<HTMLAnchorElement>}>
          {text}
        </Link>
      ) : (
        <div className="ct__disc" ref={disc as React.Ref<HTMLDivElement>}>
          {text}
        </div>
      )}
    </div>
  );
}
