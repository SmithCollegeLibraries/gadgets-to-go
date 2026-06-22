# Custom filter display redesign (home page)

**Date:** 2026-06-22
**Status:** Approved — ready for implementation plan
**Scope:** Presentation only. No backend, data-model, or filtering-logic changes.

## Problem

The custom filter options (admin-defined filter groups) render on the public
SchoolPage in a way that looks out of place, is poorly laid out, and feels clunky:

1. **Out of place** — each custom filter shows a bold gray label above it (the raw
   `group.name`, e.g. `circulating-collection`), while the adjacent native "All
   Libraries" select has no visible label. Inconsistent.
2. **Layout/spacing off** — the filters sit alone on their own row at 1/3 width with a
   large empty gap, and are a different height than the select directly above them.
3. **Clunky** — selected values render as removable badges *below* each trigger button,
   pushing the controls row down as selections change.

Confirmed visually against the running app (Smith, which has one group named
`circulating-collection`).

## Decision

Approach A — **Unified filter row**. Make the branch dropdown and all custom-filter
dropdowns read as one consistent set of controls; move selected values to a single
shared chip row so the layout never reflows.

`group.name` is free-text the admin types (placeholder "Collections"). It is displayed
**verbatim** — not auto title-cased, which would mangle names like "MH Media Resources".
The awkward `circulating-collection` is just test data; the admin can rename it in the
Filter Options tab. That is a data tidy-up, out of scope here.

## Design

### SchoolPage.jsx — filter card layout

- **Row 1:** Search box, full width.
- **Row 2 — unified filter row:** the branch dropdown ("All Libraries") and every custom
  filter dropdown sit together as responsive equal-width columns (`xs=12 sm=6 lg` auto),
  all the same height and style. No floating slug labels.
- **Active-filters chip row:** rendered only when at least one custom filter value is
  selected. One shared row of removable chips beneath the filter row, built by SchoolPage
  from `selectedCustomFilters` × `filterGroups`. Each chip removes a single selected value.
  Keeps the controls row from reflowing as selections change.
- **Row 3:** existing controls (Grid/Table, Available Only, Group by Library) — unchanged.

### MultiSelectFilter.jsx — component changes

- Trigger button restyled to match the Bootstrap select: white background, `#dee2e6`
  border, matching height/padding, chevron on the right. Resting label is the placeholder
  ("All Collections"), mirroring "All Libraries".
- Two new props, both backward-compatible so admin usages (AddItemModal, InventoryTab)
  are untouched:
  - `ariaLabel` — accessible name for the trigger, now that the visible label is gone.
  - `showSelectedBadges` (default `true`) — home page passes `false`; chips move to the
    shared row. Admin usages keep the default and are unaffected.

## Out of scope

- Backend, data-model, or filtering-logic changes.
- Renaming the existing `circulating-collection` test group (admin data tidy-up).
- Converting the native branch select into a MultiSelectFilter (considered as Approach B;
  rejected as unnecessary risk).
