---
name: popover-and-menu-geometry
description: Viewport clamping, floating element collision avoidance, boundary-aware positioning, and auto-sizing for dropdowns.
metadata:
  model: inherit
---

# Popover and Menu Geometry

## Rules

1. **Collision Padding**:
   - Provide at least `8px` collision padding to prevent popups from touching screen edges.
   - Max width should respect `calc(100vw - 1.5rem)` on small viewports.

2. **Z-Index Layering**:
   - Always portal to root with `z-50` or higher to escape parent stacking contexts (`transform`, `filter`, `backdrop-filter`, `overflow-hidden`).

3. **Width Clamping**:
   - Set popup `min-w-[var(--anchor-width,10rem)]` and `w-max` bounded by `max-w-[min(var(--available-width,90vw),28rem)]` to ensure long text never leaks outside popup borders.
