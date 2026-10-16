"use client";

import Link from "next/link";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { onIntro } from "@/lib/motion";
import "./CircleCta.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Props = {
  href: string;
  /** Visible text inside the circle (also the accessible name). */
  label: string;
  /** Diameter: a number (px) or any CSS length / var, e.g. "var(--cta)". */
  size?: number | string;
  tone?: "red" | "light" | "ink";
  /**
   * When it mounts (scale + opacity):
   *  "intro"  – after the page wipe clears (use in the hero)
   *  "scroll" – the first time it scrolls into view (use further down the page)
   *  "none"   – already visible, no entrance
   */
  appear?: "intro" | "scroll" | "none";
  /** Extra seconds to wait before the entrance plays. */
  delay?: number;
  /** Pull towards the cursor (fine pointers only). */
  magnetic?: boolean;
  /** Replaces the default arrow. */
  icon?: ReactNode;
  className?: string;
};

export default function CircleCta({
  href,
  label,
  size,
  tone = "red",
  appear = "scroll",
  delay = 0,
  magnetic = true,
  icon,
  className = "",
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = wrap.current;
      if (!el) return;
      const body = el.querySelector<HTMLElement>(".cc__body");
      const content = el.querySelector<HTMLElement>(".cc__content");

      const mm = gsap.matchMedia();

      /*  mount: scale + opacity  */
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (appear === "none") return;

        gsap.set(el, { autoAlpha: 0, scale: 0.4 });
        const play = () => {
          gsap.to(el, { scale: 1, duration: 1.1, ease: "back.out(1.6)", delay });
          gsap.to(el, { autoAlpha: 1, duration: 0.5, ease: "power2.out", delay });
        };

        if (appear === "intro") return onIntro(play);

        const st = ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: play });
        return () => st.kill();
      });

      /*  magnetic */
      mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        if (!magnetic || !body || !content) return;
        const bx = gsap.quickTo(body, "x", { duration: 0.6, ease: "power3" });
        const by = gsap.quickTo(body, "y", { duration: 0.6, ease: "power3" });
        const cx = gsap.quickTo(content, "x", { duration: 0.6, ease: "power3" });
        const cy = gsap.quickTo(content, "y", { duration: 0.6, ease: "power3" });

        const move = (e: PointerEvent) => {
          const r = body.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          bx(dx * 0.3);
          by(dy * 0.3);
          cx(dx * 0.15);
          cy(dy * 0.15);
        };
        const leave = () => {
          bx(0);
          by(0);
          cx(0);
          cy(0);
        };
        body.addEventListener("pointermove", move);
        body.addEventListener("pointerleave", leave);
        return () => {
          body.removeEventListener("pointermove", move);
          body.removeEventListener("pointerleave", leave);
        };
      });
    },
    { scope: wrap }
  );

  return (
    <div
      ref={wrap}
      className={`cc cc--${tone} ${className}`.trim()}
      style={size !== undefined ? ({ "--cc-size": typeof size === "number" ? `${size}px` : size } as CSSProperties) : undefined}
    >
      <Link href={href} className="cc__body" aria-label={label}>
        <span className="cc__content">
          <span className="cc__label">{label}</span>
          {icon ?? (
            <svg className="cc__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" aria-hidden="true">
              <path d="M6 18L18 6M8 6h10v10" />
            </svg>
          )}
        </span>
      </Link>
    </div>
  );
}
