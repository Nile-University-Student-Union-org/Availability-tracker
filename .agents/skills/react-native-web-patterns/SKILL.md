---
name: react-native-web-patterns
description: Mobile-native design patterns for Next.js/React web, delivering sheet drawers, bottom action sheets, and native picker feel.
metadata:
  model: inherit
---

# React Native Web Patterns & Mobile Sheet Design

## Guidelines

1. **Bottom Sheet vs Popover**:
   - On screens `< 768px`, dense selection lists or multi-option forms should utilize smooth bottom sheets with drag handles and sticky footers.
   - On desktop, utilize floating anchor popovers aligned with the trigger.

2. **Native Momentum & Overscroll**:
   - Apply `-webkit-overflow-scrolling: touch` and `overscroll-behavior: contain` to prevent body scroll chaining while scrolling dropdown lists.

3. **Status Indicators & Checkmarks**:
   - Use high-contrast indicators, micro-animations for selection checks, and distinct badge count bubbles.

