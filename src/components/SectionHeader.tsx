"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { onIntro } from "@/lib/motion";
import "./SectionHeader.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type HeaderLine = { text: string; accent?: boolean };

type Props = {
  /** Small mono label above the title. Wrap a word in <b> to tint it red. */
  eyebrow?: ReactNode;
  /** Title, one entry per line. `accent` tints a line red. */
  lines: HeaderLine[];
  as?: "h1" | "h2" | "h3";
  tone?: "dark" | "light"; // dark = white text (for black sections), light = ink text
  align?: "left" | "center";
  size?: "md" | "lg" | string; // "md" | "lg" or any CSS font-size
  /** Hairline that draws under the header. */
  rule?: boolean;
  /**
   *  "scroll" – plays once when the header scrolls into view (default)
   *  "intro"  – plays after the page wipe clears (use in the hero)
   *  "none"   – no animation
   */
  appear?: "scroll" | "intro" | "none";
  /** ScrollTrigger start (appear="scroll"). */
  start?: string;
  delay?: number;
  className?: string;
};

export default function SectionHeader({
  eyebrow,
  lines,
  as: Tag = "h2",
  tone = "dark",
  align = "left",
  size = "md",
  rule = false,
  appear = "scroll",
  start = "top 88%",
  delay = 0,
  className = "",
}: Props) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el || appear === "none") return;
      const $ = gsap.utils.selector(el);
      const tick = $("[data-tick]");
      const eyeText = $("[data-eye]");
      const words = $("[data-word]");
      const ruleEl = $("[data-rule]");

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(tick, { scale: 0, rotate: 90 });
        gsap.set(eyeText, { clipPath: "inset(0% 100% 0% 0%)", x: -8 });
        gsap.set(words, { yPercent: 120, rotate: 6, transformOrigin: "0% 100%" });
        gsap.set(ruleEl, { scaleX: 0, transformOrigin: "0% 50%" });

        const tl = gsap.timeline({ paused: true, delay, defaults: { ease: "expo.out" } });
        tl.to(tick, { scale: 1, rotate: 0, duration: 0.9, ease: "back.out(2)" }, 0)
          .to(eyeText, { clipPath: "inset(0% 0% 0% 0%)", x: 0, duration: 1 }, 0.1)
          .to(words, { yPercent: 0, rotate: 0, duration: 1.3, stagger: 0.07 }, 0.2)
          .to(ruleEl, { scaleX: 1, duration: 1.6, ease: "expo.inOut" }, 0.5);

        if (appear === "intro") return onIntro(() => tl.play());

        const st = ScrollTrigger.create({ trigger: el, start, once: true, onEnter: () => tl.play() });
        return () => st.kill();
      });
    },
    { scope: root }
  );

  const label = lines.map((l) => l.text).join(" ");
  const style =
    size === "md" || size === "lg" ? undefined : ({ "--sh-size": size } as CSSProperties);

  return (
    <div ref={root} className={`sh sh--${tone} sh--${align} sh--${size === "lg" ? "lg" : "md"} ${className}`.trim()} style={style}>
      {eyebrow && (
        <span className="sh__eyebrow">
          <i className="sh__tick" data-tick aria-hidden="true" />
          <span data-eye>{eyebrow}</span>
        </span>
      )}
      <Tag className="sh__title" aria-label={label}>
        {lines.map((l, i) => (
          <span key={i} className={`sh__mask${l.accent ? " sh__mask--accent" : ""}`} aria-hidden="true">
            {l.text.split(" ").map((w, j, arr) => (
              <span key={j}>
                <span className="sh__word" data-word>{w}</span>
                {j < arr.length - 1 ? " " : null}
              </span>
            ))}
          </span>
        ))}
      </Tag>
      {rule && <span className="sh__rule" data-rule aria-hidden="true" />}
    </div>
  );
}
