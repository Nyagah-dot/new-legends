import type Lenis from "lenis";

/** from  CSS tokens in global styles */
export const EASE = {
  out: "expo.out",
  inOut: "expo.inOut",
  spring: "elastic.out(1,.6)",
} as const;

export const DUR = { fast: 0.2, med: 0.5, slow: 1.1 } as const;

/** Sticky-nav height */
export function headerOffset(): number {
  if (typeof window === "undefined") return 70;
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-height"));
  return Number.isFinite(v) ? v : 70;
}

/*intro wipe up*/

export const INTRO_EVENT = "legends:intro";

declare global {
  interface Window {
    __legendsIntro?: boolean;
  }
}

export function introDone(): boolean {
  return typeof window !== "undefined" && !!window.__legendsIntro;
}

export function fireIntro() {
  window.__legendsIntro = true;
  window.dispatchEvent(new Event(INTRO_EVENT));
}

/**  cb once */
export function onIntro(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  if (window.__legendsIntro) {
    cb();
    return () => {};
  }
  const h = () => cb();
  window.addEventListener(INTRO_EVENT, h, { once: true });
  return () => window.removeEventListener(INTRO_EVENT, h);
}

/*  shared Lenis instance  */

let lenisRef: Lenis | null = null;
export const setLenis = (l: Lenis | null) => {
  lenisRef = l;
};
export const getLenis = () => lenisRef;
