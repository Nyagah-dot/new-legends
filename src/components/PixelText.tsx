"use client";

import { useId, useRef, type ElementType, type ReactNode, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { onIntro } from "@/lib/motion";
import "./PixelText.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Props = {
  children: ReactNode;
  /** Element to render (p, h3, span...). */
  as?: ElementType;
  className?: string;
  /** "scroll" = first time it enters the viewport, "intro" = after the page wipe, "none" = static. */
  appear?: "scroll" | "intro" | "none";
  /** Seconds to wait before the reveal starts. */
  delay?: number;
  /** Total seconds the reveal takes. */
  duration?: number;
  /** Starting block size in px (bigger = chunkier start). */
  maxCell?: number;
  /** How many resolution steps it passes through on the way to sharp. */
  steps?: number;
  /** Element whose scroll position triggers the reveal (defaults to the text itself). */
  trigger?: RefObject<HTMLElement | null>;
};

/**
 * Pixelated reveal: the text starts as coarse blocks and resolves, step by step,
 * into crisp type. Real DOM text throughout (selectable, accessible, layout never
 * changes). The effect is an SVG pixelate filter that GSAP animates, removed at the end.
 */
export default function PixelText({
  children,
  as: Tag = "span",
  className = "",
  appear = "scroll",
  delay = 0,
  duration = 1.1,
  maxCell = 22,
  steps = 7,
  trigger,
}: Props) {
  const el = useRef<HTMLElement>(null);
  const defs = useRef<SVGSVGElement>(null);
  const fid = "px" + useId().replace(/[^a-zA-Z0-9]/g, "");

  useGSAP(() => {
    const node = el.current;
    const svg = defs.current;
    if (!node || !svg || appear === "none") return;

    const flood = svg.querySelector("feFlood");
    const size = svg.querySelector(".px-size");
    const morph = svg.querySelector("feMorphology");
    if (!flood || !size || !morph) return;

    // cell = block size in px (even, >= 2). Flood sample sits at the cell's centre.
    const setCell = (c: number) => {
      const cell = Math.max(2, 2 * Math.round(c / 2));
      const m = cell / 2;
      flood.setAttribute("x", String(m - 1));
      flood.setAttribute("y", String(m - 1));
      size.setAttribute("width", String(cell));
      size.setAttribute("height", String(cell));
      morph.setAttribute("radius", String(m));
    };

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      setCell(maxCell);
      node.style.filter = `url(#${fid})`;
      gsap.set(node, { autoAlpha: 0 });

      const state = { p: 0 };
      const play = () => {
        gsap.to(node, { autoAlpha: 1, duration: 0.3, delay, ease: "none" });
        gsap.to(state, {
          p: 1,
          duration,
          delay,
          ease: `steps(${steps})`,
          onUpdate: () => setCell(maxCell + (2 - maxCell) * state.p),
          onComplete: () => {
            node.style.filter = ""; // crisp, filter-free text at the end
          },
        });
      };

      let cleanup: (() => void) | undefined;
      if (appear === "intro") {
        cleanup = onIntro(play);
      } else {
        const st = ScrollTrigger.create({
          trigger: trigger?.current ?? node,
          start: "top 88%",
          once: true,
          onEnter: play,
        });
        cleanup = () => st.kill();
      }

      return () => {
        cleanup?.();
        node.style.filter = "";
      };
    });
  });

  return (
    <>
      <svg ref={defs} className="px__defs" width="0" height="0" aria-hidden="true" focusable="false">
        <filter id={fid} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feFlood x="9" y="9" width="2" height="2" />
          <feComposite className="px-size" width="20" height="20" />
          <feTile result="tiles" />
          <feComposite in="SourceGraphic" in2="tiles" operator="in" />
          <feMorphology operator="dilate" radius="10" />
        </filter>
      </svg>
      <Tag ref={el} className={`px ${className}`.trim()}>
        {children}
      </Tag>
    </>
  );
}
