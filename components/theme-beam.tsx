"use client";

import type * as React from "react";

export const THEME_BEAM_EVENT = "nusu-theme-beam";

export type ThemeBeamDetail = {
  targetTheme: "light" | "dark";
  alreadySwitched?: boolean;
};

export function triggerThemeBeam() {
  // Legacy stub for backwards compatibility
}

/**
 * High-performance, 120fps circular clip-path theme transition.
 * Expands a silky-smooth circular wavefront anchored to the toggle button's exact center.
 * Pauses background CSS transitions during interpolation to eliminate mobile GPU frame drops.
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

  // Determine origin coordinates with robust mobile touch & button target fallback
  let x = window.innerWidth / 2;
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

  // Calculate maximum hypotenuse distance to viewport corners
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const hasViewTransition =
    typeof document !== "undefined" && "startViewTransition" in document;

  if (hasViewTransition) {
    try {
      // Temporarily mark document to disable conflicting CSS background transitions
      document.documentElement.classList.add("theme-transitioning");

      const transition = (
        document as unknown as {
          startViewTransition: (cb: () => void) => {
            ready: Promise<void>;
            finished: Promise<void>;
          };
        }
      ).startViewTransition(() => {
        if (targetTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
        setTheme(targetTheme);
      });

      transition.ready
        .then(() => {
          const clipPath = [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ];

          const anim = document.documentElement.animate(
            {
              clipPath: clipPath,
            },
            {
              duration: 440,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              pseudoElement: "::view-transition-new(root)",
              fill: "forwards",
            },
          );

          anim.finished.finally(() => {
            document.documentElement.classList.remove("theme-transitioning");
          });
        })
        .catch(() => {
          document.documentElement.classList.remove("theme-transitioning");
        });

      transition.finished.finally(() => {
        document.documentElement.classList.remove("theme-transitioning");
      });

      return;
    } catch {
      document.documentElement.classList.remove("theme-transitioning");
    }
  }

  setTheme(targetTheme);
}

export function ThemeBeam() {
  return null;
}
