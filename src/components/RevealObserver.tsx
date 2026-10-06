"use client";

import { useEffect } from "react";

/**
 * Fade-in on scroll. Elements are visible by default; only those below the
 * fold get armed (hidden) and then revealed as they enter the viewport.
 */
export default function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.1 }
    );

    els.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) return; // already on screen
      el.classList.add("armed");
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return null;
}
