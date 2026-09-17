---
name: theme-engine-architecture
description: Architect zero-FOUC theme engines, color science token pipelines, smooth optical caustics/beam transitions, and accessible dark/light mode state choreography.
---

# Theme Engine Architecture & Optical Transitions

This skill covers the design and implementation of production-grade theme engines, color science, and cinematic transition overlays.

---

## 1. Zero-FOUC (Flash of Unstyled Content) Guarantee

### 1.1 Synchronous Pre-Hydration Script
- Never rely exclusively on client-side React `useEffect` to apply the initial theme class (`dark` or `light`).
- Render a synchronous inline `<script>` in the document `<head>` before any stylesheets or DOM nodes are parsed:
  ```html
  <script>
    (function() {
      try {
        const stored = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (stored === 'dark' || (!stored && prefersDark)) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (e) {}
    })();
  </script>
  ```

---

## 2. Cinematic Beam & Caustic Transitions

### 2.1 The Optical Beam Philosophy
- When a user switches themes, rather than a jarring instant flash or a muddy full-page CSS `transition: background 0.3s` (which produces muddy midtones), use a **directed optical sweep (beam)**.
- The beam simulates a physical wave of light or darkness washing across the surface of the glass interface:
  - **Light to Dark**: A deep, radiant violet-indigo/cyan wavefront carrying midnight depth.
  - **Dark to Light**: A brilliant sunlit caustics wave with gold/sky blue dispersion, leaving bright crisp daylight in its wake.

### 2.2 Compositor Invariants
- The beam must be strictly GPU accelerated:
  - Animate ONLY `transform: translate3d(...)` and `opacity`.
  - Never animate `left`, `width`, `margin`, or `filter` on every frame.
  - Apply `pointer-events: none` and `will-change: transform, opacity`.
  - Clean up DOM overlays immediately after the animation completes (`onAnimationEnd`).

### 2.3 Chromatic Dispersion & Angles
- A natural sweep angle of `105deg` to `115deg` mimics light entering from top-right or top-left.
- Gradient stops should incorporate subtle chromatic fringe:
  - Leading edge: subtle high-energy cyan/blue glow.
  - Core crest: pure specular white / brilliant laser beam.
  - Trailing edge: warm amber/gold or deep royal blue refraction tail.
