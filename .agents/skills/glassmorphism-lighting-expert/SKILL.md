---
name: glassmorphism-lighting-expert
description: Master the optics, physical caustics, specular highlights, and chromatic dispersion of high-end frosted glass and luminous beam interfaces.
category: frontend
tags: [ui, glassmorphism, css, optics, caustics, design-system]
---

# 💎 Glassmorphism & Optical Lighting Expert

This skill provides mechanical and physical invariants for crafting Apple/macOS/Raycast-grade frosted glass, caustic light beams, specular edge highlights, and chromatic dispersion.

---

## 1. Physical Principles of Glassmorphism

True glassmorphism is an optical simulation of light passing through frosted optical glass (`silicate/borosilicate`). It fails when treated as a flat semi-transparent rectangle.

### Core Invariants:
1. **Underlying Contrast**:
   - `backdrop-filter: blur(...)` requires colorful, organic shapes passing *behind* it to be visible. Blurring a solid background produces flat color.
   - Position high-saturation ambient glow orbs (`blur-3xl`, `saturate-150%`) directly behind the glass boundaries.
2. **Surface Refraction vs. Diffusion**:
   - Always pair `backdrop-filter: blur(24px-36px)` with `saturate(180%-200%)` to prevent the blurred background from appearing muddy or gray.
   - Light mode surface: `rgba(255, 255, 255, 0.45)` to `rgba(255, 255, 255, 0.65)`.
   - Dark mode surface: `rgba(4, 12, 22, 0.55)` to `rgba(6, 19, 34, 0.70)`.
3. **Double-Layer Specular Highlights**:
   - Real glass catches light along its beveled perimeter:
     ```css
     box-shadow:
       inset 0 0 0 1px rgba(255, 255, 255, 0.85),     /* Outer perimeter rim */
       inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.95),   /* Top specular bevel */
       0 24px 56px -15px rgba(15, 48, 86, 0.16);        /* Ambient drop shadow */
     ```
   - In dark mode, replace white bevels with translucent cyan/sky specular crests (`rgba(255, 255, 255, 0.15)` + `rgba(45, 177, 250, 0.25)`).

---

## 2. Caustic Light Beams & Chromatic Dispersion

When light travels across an interface during transitions or theme switches:
1. **Angle of Incidence**:
   - Standardize on an asymmetric diagonal (e.g. `108deg` or `115deg`). Straight vertical or horizontal sweeps feel robotic; angled sweeps feel cinematic.
2. **Chromatic Dispersion (Prism Effect)**:
   - Light breaks into spectral frequencies:
     - Leading edge: Warm gold/amber pre-glow (`rgba(229, 168, 35, 0.2)`).
     - Center crest: Pure white laser peak (`rgba(255, 255, 255, 1)`).
     - Trailing edge: Cool cyan/royal blue dispersion (`rgba(45, 177, 250, 0.45)`).
3. **Full-Viewport Propagation**:
   - An optical sweep must penetrate all interface layers in unison. The navbar beam, screen wash, and background bloom must travel on the exact same duration and cubic-bezier curve.

---

## 3. Performance & GPU Compositor Rules

- Never animate `filter`, `backdrop-filter`, or `box-shadow` continuously.
- Only animate `transform: translate3d(...)` and `opacity`.
- Use `will-change: transform` and `transform: translateZ(0)` to promote beam layers to isolated GPU compositor surfaces.
- Always include `@media (prefers-reduced-motion: reduce)` fallbacks.
