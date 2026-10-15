
"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function SmoothScroll() {
  useEffect(() => {
    const motionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    // visitor's motion preference.
    if (motionQuery.matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.085,
      smoothWheel: true,
      syncTouch: false,
      anchors: true,
    });

    //  Lenis and GSAP's scroll position sync
    const updateScrollTrigger = () => {
      ScrollTrigger.update();
    };

    lenis.on("scroll", updateScrollTrigger);

    //  Lenis + GSAP's ticker
    const updateLenis = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateLenis);

   
    gsap.ticker.lagSmoothing(0);

    const refresh = () => ScrollTrigger.refresh();

    window.addEventListener("load", refresh);

    // Cleanup 
    return () => {
      window.removeEventListener("load", refresh);
      lenis.off("scroll", updateScrollTrigger);
      gsap.ticker.remove(updateLenis);

      lenis.destroy();
      ScrollTrigger.refresh();
    };
  }, []);

  return null;
}
