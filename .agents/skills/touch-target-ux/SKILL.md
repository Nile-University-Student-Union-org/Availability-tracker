---
name: touch-target-ux
description: Touch-first ergonomics, thumb-zone mapping, minimum 44px/48px tap targets, haptic feedback, and fluid active states.
metadata:
  model: inherit
---

# Touch Target UX & Mobile Ergonomics

## Invariants

1. **Minimum Dimensions**:
   - Primary buttons & touch cards: `min-h-[44px]` (preferably `min-h-[48px]`).
   - Interactive icons: minimum `p-2` padding container or explicit `size-10` touch bounds.

2. **Thumb Zone Accessibility**:
   - Essential actions (Save, Submit, Next, Filter) must be reachable within one-handed thumb reach at the bottom of the viewport or sticky bottom bars.

3. **Active Physics**:
   - Add `touch-manipulation active:scale-[0.98]` and smooth cubic-bezier transitions for tactile haptic-like responsiveness on touch.
