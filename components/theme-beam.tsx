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
 * Apple-grade circular theme transition orchestrator.
 * Expands a silky-smooth circular clip-path wavefront centered at the exact click coordinates.
 */
export function executeThemeTransition(
  targetTheme: "light" | "dark",
  setTheme: (theme: string) => void,
  event?:
    | React.MouseEvent<HTMLElement>
    | MouseEvent
    | { clientX: number; clientY: number },
) {
  if (typeof window === "undefined") return;

  // Reduced motion: instant switch
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setTheme(targetTheme);
    return;
  }

  // Determine origin coordinates for circular ripple
  let x = window.innerWidth - 48;
  let y = 32;

  if (event && typeof event.clientX === "number" && event.clientX > 0) {
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
      const transition = (
        document as unknown as {
          startViewTransition: (cb: () => void) => { ready: Promise<void> };
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

          document.documentElement.animate(
            {
              clipPath: clipPath,
            },
            {
              duration: 520,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            },
          );
        })
        .catch(() => {
          // Fallback if pseudo-element animation is rejected
        });
      return;
    } catch {
      // Fallback below
    }
  }

  setTheme(targetTheme);
}

export function ThemeBeam() {
  return null;
}
