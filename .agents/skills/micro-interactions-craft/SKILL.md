---
name: micro-interactions-craft
description: Implement tactile micro-interactions, haptic visual feedback, sliding hover pills, button glints, and responsive interactive feedback.
category: frontend
tags: [micro-interactions, buttons, hover, active-states, feedback, ui-craft]
---

# ✨ Micro-Interactions & Interaction Craft

This skill details patterns for building tactile, physical, and delightful micro-interactions across interactive elements.

---

## 1. The Three-Layer Click Feedback Architecture

Every primary button or interactive tab benefits from physical tactile response:
1. **Geometric Scale**: On press (`:active`), scale the element to `scale(0.97 - 0.985)` with instant response (`0.1s`).
2. **Radial Energy Ripple**: Expand a subtle ring outward (`animate-nav-click-ripple`) that dissolves after `350ms`.
3. **Specular Glint**: A momentary white flash or linear gradient sweep across the surface (`animate-nav-click-glint`).

---

## 2. Dynamic Sliding Hover Pill (Magnetic Pill Tracking)

When a navigation bar or tab list contains multiple items:
- Do not attach separate background pills to every link.
- Use a single shared `<span className="absolute rounded-full pointer-events-none" />` that translates and resizes dynamically (`offsetLeft`, `offsetWidth`) to follow the user's cursor.
- Easing: Apply `cubic-bezier(0.23, 1, 0.32, 1)` with `300ms` duration.
- Hover exit: Smoothly fade `opacity: 0` when the cursor leaves the nav container without snapping to `(0, 0)`.

---

## 3. Focus & Form Input Polish

- **Focus-Within Context**: When an input field gains focus, smoothly illuminate its adjacent icons or label colors from neutral muted tones to the primary brand accent (e.g., Nile Royal Blue `#018BCE`).
- **Focus Rings**: Pair a 1px border shift with a 3px-4px soft translucent glow (`ring-4 ring-nusu-blue/15`).
- **Show/Hide Password Controls**: Toggles must preserve tab order, feature clear accessible `aria-label` tags, and transition icon glyphs smoothly.
