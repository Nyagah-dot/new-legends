"use client";

import Link from "next/link";
import { useId, useRef, type CSSProperties, type ReactNode } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import "./CircleCta.css";

gsap.registerPlugin(useGSAP);

type Props = {
  /** Provide href for a button-like link; omit for a static badge (e.g. spinning price). */
  href?: string;
  /** Accessible name (required when href is set). */
  label?: string;
  /** Text that spins around the rim. Repeated automatically to fill the circle. */
  ring?: string;
  /** Anything CSS accepts, e.g. 120, "10rem" or "var(--cta)". */
  size?: number | string;
  tone?: "red" | "light" | "ink";
  /** Custom centre content. Defaults to a diagonal arrow. */
  children?: ReactNode;
  /** Magnetic pull towards the cursor (fine pointers only). */
  magnetic?: boolean;
  className?: string;
};

const CIRC = 2 * Math.PI * 38; // ring path radius is 38 in a 100x100 viewBox

export default function CircleCta({
  href,
  label,
  ring = "Book a session",
  size,
  tone = "red",
  children,
  magnetic = true,
  className = "",
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const pathId = "cc" + useId().replace(/[^a-zA-Z0-9]/g, "");

  // Fill the rim: repeat the phrase, size the font so it lands near the circumference.
  const unit = `${ring.toUpperCase()} \u2022 `;
  const reps = Math.max(1, Math.round(48 / unit.length));
  const text = unit.repeat(reps);
  const fontSize = +((CIRC + 1) / (text.length * 0.66)).toFixed(2);

  useGSAP(
    () => {
      if (!magnetic || !href) return;
      const mm = gsap.matchMedia();
      mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const el = wrap.current?.querySelector<HTMLElement>(".cc__body");
        if (!el) return;
        const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" });
        const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" });
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
          yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
        };
        const leave = () => {
          xTo(0);
          yTo(0);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        return () => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
        };
      });
    },
    { scope: wrap }
  );

  const inner = (
    <>
      <svg className="cc__ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <defs>
          <path id={pathId} d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <text fontSize={fontSize}>
          <textPath href={`#${pathId}`} textLength={CIRC} lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </svg>
      <span className="cc__center">
        {children ?? (
          <svg className="cc__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true">
            <path d="M6 18L18 6M8 6h10v10" />
          </svg>
        )}
      </span>
    </>
  );

  return (
    <div
      ref={wrap}
      className={`cc cc--${tone} ${className}`.trim()}
      style={size !== undefined ? ({ "--cc-size": typeof size === "number" ? `${size}px` : size } as CSSProperties) : undefined}
    >
      {href ? (
        <Link href={href} className="cc__body" aria-label={label ?? ring}>
          {inner}
        </Link>
      ) : (
        <div className="cc__body">{inner}</div>
      )}
    </div>
  );
}
