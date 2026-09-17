---
name: optical-shadows-and-depth
description: Multi-layered physics-based optical shadows, ambient occlusion, luminous edge highlights, and spatial z-depth hierarchies without muddy drop-shadows.
---

# Optical Shadows, Ambient Occlusion & Depth Craft

This skill defines the technical standards for rendering physical elevation, realistic ambient occlusion, and glass caustics without muddy, blurry CSS drop-shadows.

---

## 1. The Physics of Light & Shadow

### 1.1 The Failure of Single `box-shadow`
- Real-world light does not cast a single blurred gray oval.
- Sunlight or ambient studio lighting creates:
  1. **Contact Shadow (Umbra)**: Tight, darker, very sharp directly beneath the touching edge (0.5px to 2px offset).
  2. **Penumbra (Direct Dispersion)**: Softer, medium-distance falloff representing directional light.
  3. **Ambient Occlusion (Antumbra)**: Extremely subtle, wide atmospheric tinting that grounds the element in 3D space.

### 1.2 Multi-Stop Shadow Recipes
Instead of `box-shadow: 0 10px 20px rgba(0,0,0,0.2)`, use stratified color-tinted layers:

```css
/* Premium Glass Elevation (Light Mode) */
box-shadow:
  0 1px 2px -1px rgba(15, 48, 86, 0.08),
  0 4px 12px -2px rgba(15, 48, 86, 0.06),
  0 16px 32px -4px rgba(15, 48, 86, 0.04),
  inset 0 1px 0 0 rgba(255, 255, 255, 0.9),
  inset 0 0 0 1px rgba(255, 255, 255, 0.6);

/* Midnight Navy Elevation (Dark Mode) */
box-shadow:
  0 1px 2px 0 rgba(0, 0, 0, 0.45),
  0 8px 24px -4px rgba(0, 0, 0, 0.55),
  0 24px 48px -8px rgba(1, 139, 206, 0.08),
  inset 0 1px 1px 0 rgba(255, 255, 255, 0.12),
  inset 0 0 0 1px rgba(45, 177, 250, 0.15);
```

---

## 2. Invariants

1. **Never use pure black (`#000000`) for light mode shadows**:
   - Always tint shadows with the primary brand undertone (e.g. `rgba(15, 48, 86, ...)` - Nile Navy) so elements appear naturally integrated rather than dirty.
2. **Dual-Layer Specular Inset Rim**:
   - Every elevated card or floating panel must have a top-edge specular highlight (`inset 0 1px 0 ...`) mimicking physical light catching the bevel of real cut glass.
3. **Z-Index Layer Hierarchy**:
   - Level 0: Background Canvas
   - Level 1: Flat Content Cards
   - Level 2: Interactive Floating Cards / Badges
   - Level 3: Dropdowns, Popovers, Tooltips
   - Level 4: Sticky Glass Navbars & Headers
   - Level 5: Modal Overlays & Drawers
   - Level 6: Full-Screen Transitions & Beams
