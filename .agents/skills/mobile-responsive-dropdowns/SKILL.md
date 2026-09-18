---
name: mobile-responsive-dropdowns
description: Master mobile-first select dropdowns, custom pickers, overflow mitigation, and viewport-aware floating elements.
metadata:
  model: inherit
---

# Mobile Responsive Dropdowns & Select Architecture

## Core Rules for Mobile-First Select & Popover Components

1. **Zero Text Truncation Bugs in Flexbox**:
   - Flex children with `truncate` MUST have `min-w-0` and NEVER `shrink-0`.
   - On narrow triggers, allow clean ellipsis truncation while ensuring the open popover container expands to fit or uses dynamic word wrapping.

2. **Viewport Boundary & Width Anchoring**:
   - Always bound dropdown content: `min-w-[var(--anchor-width,12rem)]`, `max-w-[min(var(--available-width,calc(100vw-2rem)),26rem)]`, and `max-h-[60vh]`.
   - Prevent horizontal overflow across mobile devices by wrapping popups with `overflow-x-hidden` and `overflow-y-auto`.

3. **Touch-Friendly Hit Targets**:
   - Every select item must satisfy `min-h-[44px]` (or `min-h-[40px]` on compact tables) on mobile touch screens with `touch-manipulation`.
   - Add clear selected state checkmarks anchored right (`pr-9 pl-3.5`).

4. **Layering & Portaling**:
   - Always mount dropdown popups into a Portal with `z-50` and backdrop blur to prevent clipping inside parent cards with `overflow-hidden`.
