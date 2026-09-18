---
name: adaptive-filter-ux
description: Adaptive multi-criteria filter bars, instant search, responsive filter chips, and bulk selection architecture for complex dashboards.
metadata:
  model: inherit
---

# Adaptive Filter UX & Multi-Select Architecture

## Architectural Principles

1. **State Transparency**:
   - Always display active filter counts and clear tags so users know exactly which filters are applied.
   - Provide "Select All", "Reset to All", and quick search to handle long lists of categories.

2. **Mobile Viewport Adaptation**:
   - When filter options contain long strings (e.g., committee names > 30 chars), format options with text truncation or fluid 2-line wraps with pill tags.
   - Position search bars sticky at the top of the dropdown container.

