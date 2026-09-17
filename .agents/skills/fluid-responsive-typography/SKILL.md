---
name: fluid-responsive-typography
description: Master fluid typography scales, font pairings (editorial serif + technical sans), optical kerning, vertical rhythm, and modern CSS clamp() systems without layout shifts.
---

# Fluid Responsive Typography & Editorial Craft

This skill governs typography design and implementation, ensuring razor-sharp legibility, high editorial elegance, and fluid scaling across viewports without jarring breakpoint jumps.

---

## 1. Core Principles

### 1.1 The Golden Ratio & Modern Fluid Math
- Never use fixed static `px` or abrupt media query jumps for headings.
- Use mathematically calibrated `clamp()` functions that anchor minimum mobile sizes and maximum ultra-wide sizes smoothly:
  ```css
  /* Fluid Hero Display */
  font-size: clamp(2.5rem, 1.8rem + 3.5vw, 5.5rem);
  line-height: clamp(1.05, 1 + 0.1vw, 1.15);
  letter-spacing: -0.035em;
  
  /* Fluid Section Eyebrow / Subhead */
  font-size: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  ```

### 1.2 Editorial Serif Pairing
- Pair high-contrast, delicate display serifs (e.g. `Instrument Serif`, `Playfair`, `Editorial New`) with disciplined geometric or humanist sans-serifs (e.g. `Inter`, `Geist`, `Plus Jakarta Sans`).
- **Rule of Weight**: When using italic display serifs for emphasis (e.g. "student *portal*"), always ensure the italic font size is slightly elevated or optically kerned (`letter-spacing: -0.01em`) so the delicate serifs do not vanish or feel pinched against heavy grotesque letterforms.

---

## 2. Invariants & Guardrails

1. **Optical Tracking**:
   - Headers (> 24px) must have negative letter spacing (`-0.02em` to `-0.04em`) to maintain tightness and physical weight.
   - Small text (< 12px) and uppercase labels must have positive letter spacing (`+0.05em` to `+0.2em`) to prevent glyph collision.
2. **Line Length (The 45-75 Character Rule)**:
   - Body paragraphs must always be constrained with `max-w-prose` or `max-w-[65ch]` to prevent reader eye fatigue.
3. **Preventing FOUT (Flash of Unstyled Text)**:
   - Use `font-display: swap;` with exact matching fallback font metrics (`size-adjust`, `ascent-override`) to eliminate cumulative layout shift (CLS).
4. **Contrast & Theme Invariants**:
   - Display headings must meet WCAG AAA 7:1 against their immediate backgrounds.
   - In dark mode, pure `#ffffff` can cause halation/glare on high-DPI OLED screens. Prefer `#F8FAFC` or `#F1F5F9` for secondary copy.
