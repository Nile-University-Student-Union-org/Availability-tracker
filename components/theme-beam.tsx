"use client";

import type * as React from "react";
import { flushSync } from "react-dom";

export const THEME_BEAM_EVENT = "nusu-theme-beam";

export type ThemeBeamDetail = {
  targetTheme: "light" | "dark";
  alreadySwitched?: boolean;
};

export function triggerThemeBeam() {
  // Legacy stub for backwards compatibility
}

let prewarmed = false;

/**
 * Pre-warms the browser's GPU clip-path shader pipeline and raster cache during idle time.
 * This completely eliminates the 1-2 frame drop / stutter that happens on the first 1-2 toggles.
 */
export function prewarmThemePipeline() {
  if (typeof window === "undefined" || prewarmed) return;
  prewarmed = true;

  const runWarmup = () => {
    try {
      // 1. Force GPU to compile circle clip-path shader
      const dummy = document.createElement("div");
      dummy.setAttribute("aria-hidden", "true");
      dummy.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;width:2px;height:2px;opacity:0.001;pointer-events:none;clip-path:circle(1px at 1px 1px);will-change:clip-path;";
      document.body.appendChild(dummy);

      // 2. Pre-warm SVG drop-shadow filter raster cache
      const dummyFilter = document.createElement("div");
      dummyFilter.setAttribute("aria-hidden", "true");
      dummyFilter.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;width:18px;height:18px;opacity:0.001;pointer-events:none;filter:drop-shadow(0 0 8px rgba(251,191,36,0.45)) drop-shadow(0 0 8px rgba(2,132,199,0.35));";
      document.body.appendChild(dummyFilter);

      requestAnimationFrame(() => {
        dummy.style.clipPath = "circle(2px at 1px 1px)";
        requestAnimationFrame(() => {
          dummy.remove();
          dummyFilter.remove();
        });
      });
    } catch {
      // Ignored
    }
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(runWarmup);
  } else {
    setTimeout(runWarmup, 80);
  }
}

let isTransitioning = false;
let activeAnim: Animation | null = null;

/**
 * Calculates resolution-independent percentage coordinates for clip-path.
 * Absolute px coordinates on ::view-transition-new(root) cause subpixel quantization
 * and stutter on Windows fractional display scaling (e.g. 125%, 150%) (#989).
 */
function getCircleClipPaths(
  cx: number,
  cy: number,
  maxRadius: number,
  viewportWidth: number,
  viewportHeight: number,
): [string, string] {
  const toX = (x: number) => `${(x / viewportWidth) * 100}%`;
  const toY = (y: number) => `${(y / viewportHeight) * 100}%`;
  const point = `${toX(cx)} ${toY(cy)}`;
  const toRadius = (r: number) =>
    `${(r / (Math.hypot(viewportWidth, viewportHeight) / Math.SQRT2)) * 100}%`;

  return [
    `circle(0% at ${point})`,
    `circle(${toRadius(maxRadius)} at ${point})`,
  ];
}

/**
 * High-performance, 120fps circular clip-path theme transition.
 * Uses resolution-independent percentages, pre-warmed GPU shaders, and synchronized
 * view-transition-group duration to deliver buttery-smooth 120fps motion on all displays.
 */
export function executeThemeTransition(
  targetTheme: "light" | "dark",
  setTheme: (theme: string) => void,
  event?:
    | React.MouseEvent<HTMLElement>
    | MouseEvent
    | { clientX: number; clientY: number; currentTarget?: EventTarget | null },
) {
  if (typeof window === "undefined") return;

  // Reduced motion: instant switch
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setTheme(targetTheme);
    return;
  }

  // Prevent overlapping concurrent transitions from causing frame drops
  if (isTransitioning) return;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Determine origin coordinates with robust mobile touch & button target fallback
  let x = viewportWidth / 2;
  let y = 40;

  if (
    event &&
    "currentTarget" in event &&
    event.currentTarget instanceof HTMLElement
  ) {
    const rect = event.currentTarget.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  } else if (event && typeof event.clientX === "number" && event.clientX > 0) {
    x = event.clientX;
    y = event.clientY;
  } else if (typeof document !== "undefined") {
    const toggleBtn = document.querySelector<HTMLElement>(
      '[data-theme-toggle], [aria-label*="theme" i], [title*="theme" i]',
    );
    if (toggleBtn) {
      const rect = toggleBtn.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }
  }

  const maxRadius = Math.hypot(
    Math.max(x, viewportWidth - x),
    Math.max(y, viewportHeight - y),
  );

  const [clipFrom, clipTo] = getCircleClipPaths(
    x,
    y,
    maxRadius,
    viewportWidth,
    viewportHeight,
  );

  const hasViewTransition =
    typeof document !== "undefined" && "startViewTransition" in document;

  if (hasViewTransition) {
    const root = document.documentElement;
    const duration = 400;

    root.dataset.themeTransition = "active";
    root.style.setProperty("--theme-transition-duration", `${duration}ms`);
    root.style.setProperty("--theme-transition-clip-from", clipFrom);

    const cleanup = () => {
      isTransitioning = false;
      delete root.dataset.themeTransition;
      root.style.removeProperty("--theme-transition-duration");
      root.style.removeProperty("--theme-transition-clip-from");
      if (activeAnim) {
        activeAnim.cancel();
        activeAnim = null;
      }
    };

    isTransitioning = true;

    try {
      const transition = (
        document as unknown as {
          startViewTransition: (cb: () => void) => {
            ready: Promise<void>;
            finished: Promise<void>;
          };
        }
      ).startViewTransition(() => {
        flushSync(() => {
          if (targetTheme === "dark") {
            root.classList.add("dark");
          } else {
            root.classList.remove("dark");
          }
          setTheme(targetTheme);
        });
      });

      if (transition?.finished?.finally) {
        transition.finished.finally(cleanup).catch(cleanup);
      } else {
        cleanup();
      }

      const ready = transition?.ready;
      if (ready && typeof ready.then === "function") {
        ready
          .then(() => {
            const anim = root.animate(
              {
                clipPath: [clipFrom, clipTo],
              },
              {
                duration,
                easing: "ease-in-out",
                fill: "forwards",
                pseudoElement: "::view-transition-new(root)",
              },
            );
            activeAnim = anim;
          })
          .catch(cleanup);
      }

      return;
    } catch {
      cleanup();
    }
  }

  setTheme(targetTheme);
}

export function ThemeBeam() {
  return null;
}
