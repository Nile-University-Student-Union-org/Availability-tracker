---
name: motion-design-expert
description: Design and implement high-agency motion choreography, spring physics, cubic-bezier easing curves, and GPU-composited web transitions.
category: frontend
tags: [motion, animation, gsap, spring-physics, micro-animations, css-keyframes]
---

# 🎬 Motion Design & Choreography Expert

This skill guides the implementation of natural, fluid, and physically grounded animations across web applications.

---

## 1. Timing Curves & Physical Invariants

Never use linear timing or generic `ease-in-out` for UI state transitions.

### Standardized Cubic-Bezier Curves:
- **Spring Out (Snappy Entry)**: `cubic-bezier(0.16, 1, 0.3, 1)`
  - Used for modals, toasts, dropdown reveals, and page entrances. Rapid acceleration followed by gentle deceleration.
- **Fluid Spring (Hover Tracking)**: `cubic-bezier(0.23, 1, 0.32, 1)`
  - Used for dynamic sliding pills, indicator tabs, and mouse followers.
- **Specular Sweep (Laser / Light Beams)**: `cubic-bezier(0.22, 1, 0.36, 1)`
  - High-momentum sweep with smooth exit.
- **Tactile Pop (Buttons / Icons)**: `cubic-bezier(0.34, 1.56, 0.64, 1)`
  - Elastic overshoot for haptic clicks and icon toggles.

---

## 2. Choreography & Cascading Entrances

1. **Staggered Delays**:
   - Lists and card grids should cascade with a staggered offset of `30ms - 50ms` per item.
   - Max cascade items: Cap stagger at `8 - 12` items to avoid making the user wait.
2. **Directional Intent**:
   - Entrances should emerge along the axis of visual focus (e.g., `translateY(12px) -> 0`).
   - Keep translation distances small (`8px - 20px`). Large translations feel sluggish.
3. **Exit Faster Than Entry**:
   - Elements should enter over `0.4s - 0.6s`, but exit or dismiss over `0.15s - 0.25s`.

---

## 3. Hardware Compositing & 60/120 FPS Execution

- **Compositor-Only Properties**: Restrict animations to `transform` and `opacity`.
- **Layout Thrashing Prevention**: Never animate `top`, `left`, `width`, `height`, or `margin`.
- **Subpixel Glyphs**: Set `transform-gpu` and `backface-visibility: hidden` to prevent font glyph blurring during transforms.
- **Reduced Motion**: All keyframe animations MUST disable cleanly under `@media (prefers-reduced-motion: reduce)`.
