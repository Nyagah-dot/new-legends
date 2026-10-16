"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { onIntro } from "@/lib/motion";
import "./RectCta.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Props = {
  href: string;
  /** Visible text */
  label: string;
  tone?: "red" | "light" | "ink" | "outline";
  size?: "sm" | "md" | "lg";
  /**
   *  "scroll" – wipes in when it first scrolls into view (default)
   *  "intro"  – after the page wipe clears
   *  "none"   – already visible, no entrance (parent animates it)
   */
  appear?: "intro" | "scroll" | "none";
  delay?: number;
  /** magnetic*/
  magnetic?: boolean;
  icon?: ReactNode;
  className?: string;
};

export default function RectCta({
  href,
  label,
  tone = "red",
  size = "md",
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
      const body = el.querySelector<HTMLElement>(".rc__body");
      const content = el.querySelector<HTMLElement>(".rc__content");
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (appear === "none") return;
        gsap.set(el, { clipPath: "inset(100% 0% 0% 0%)", y: 16 });
        const play = () => gsap.to(el, { clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 1.1, ease: "expo.out", delay });
        if (appear === "intro") return onIntro(play);
        const st = ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: play });
        return () => st.kill();
      });

      mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        if (!magnetic || !body || !content) return;
        const bx = gsap.quickTo(body, "x", { duration: 0.6, ease: "power3" });
        const by = gsap.quickTo(body, "y", { duration: 0.6, ease: "power3" });
        const cx = gsap.quickTo(content, "x", { duration: 0.6, ease: "power3" });
        const move = (e: PointerEvent) => {
          const r = body.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          bx(dx * 0.12);
          by(dy * 0.25);
          cx(dx * 0.06);
        };
        const leave = () => {
          bx(0);
          by(0);
          cx(0);
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
    <div ref={wrap} className={`rc rc--${tone} rc--${size} ${className}`.trim()}>
      <Link href={href} className="rc__body" aria-label={label}>
        <span className="rc__content">
          <span className="rc__label" aria-hidden="true">
            <span className="rc__roll">
              <span>{label}</span>
              <span>{label}</span>
            </span>
          </span>
          {icon ?? (
            <svg className="rc__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" aria-hidden="true">
              <path d="M6 18L18 6M8 6h10v10" />
            </svg>
          )}
        </span>
      </Link>
    </div>
  );
}
