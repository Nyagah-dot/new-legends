"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { headerOffset, onIntro, setLenis } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

/**
 * The ONE scroll engine: Lenis driven by the GSAP ticker, kept in sync with ScrollTrigger.
 * Mount once, in src/app/page.tsx (marketing page only — member/admin/desk pages keep native scroll).
 * Renders nothing. Scroll is locked until the page wipe clears.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const prevRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    if (!location.hash) window.scrollTo(0, 0);

    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.085,
      smoothWheel: true,
      syncTouch: false,
    });
    setLenis(lenis);

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);

    // Lock scroll during the intro wipe (safety net so it can never stay locked).
    lenis.stop();
    const off = onIntro(() => lenis.start());
    const safety = window.setTimeout(() => lenis.start(), 4000);

    // Same-page anchor links (e.g. "/#classes") glide, offset by the header height.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href*='#']") as HTMLAnchorElement | null;
      if (!a) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -headerOffset(), duration: 1.4 });
      history.pushState(null, "", url.hash);
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("load", refresh);
      window.clearTimeout(safety);
      off();
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
      history.scrollRestoration = prevRestoration;
      ScrollTrigger.refresh();
    };
  }, []);

  return null;
}
