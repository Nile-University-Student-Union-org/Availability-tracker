"use client";

import { useEffect } from "react";

/** One page-wide listener that lights up `.glass-bloom` surfaces where they're pressed. */
export function GlassBloom() {
  useEffect(() => {
    function onDown(e: PointerEvent) {
      const el = (e.target as Element | null)?.closest<HTMLElement>(
        ".glass-bloom",
      );
      if (!el) return;
      const r = el.getBoundingClientRect();
      const place = (p: PointerEvent) => {
        el.style.setProperty("--px", `${p.clientX - r.left}px`);
        el.style.setProperty("--py", `${p.clientY - r.top}px`);
      };
      place(e);
      el.dataset.glassPressed = "";
      const up = () => {
        delete el.dataset.glassPressed;
        window.removeEventListener("pointermove", place);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      };
      window.addEventListener("pointermove", place, { passive: true });
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    }
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
