# Unified Multi-Select Dropdowns for Library + Filters

**Date:** 2026-06-24
**Status:** Approved — ready for implementation plan

## Problem

The two filter controls on `SchoolPage` do not match:

- **"All Libraries"** (`src/pages/SchoolPage.jsx:602-613`) is a native `<select>`
  (reactstrap `Input type="select"`, Bootstrap `form-select`). **Single-select.**
  Fully keyboard/screen-reader accessible because it is a real native control.
- **"All Filters"** (`src/components/Common/CombinedFilterDropdown.jsx`) is a custom
  `<button class="form-select">` opening a floating panel with a search box and a
  checkbox list. **Multi-select.** It borrows `form-select` styling to look like a
  select but is a button + popup. Its accessibility is partial: it has
  `aria-expanded` / `aria-label` but no `aria-controls`, no Escape-to-close, no focus
  return, and its checkboxes are `readOnly` with the toggle handled by a row click.

The mismatch is not only cosmetic — they are different *control types* because one is
single-select and one is multi-select.

## Decisions

1. **Libraries become multi-select**, matching the filters. A user can select several
   libraries at once (relevant for the five-colleges context).
2. **Interaction/a11y pattern: disclosure + checkbox group** (real native checkboxes,
   Tab/Space/Escape). Chosen over a custom ARIA listbox because native checkboxes carry
   their own semantics (most robust across screen readers) and it is the smallest leap
   from the current code. Chosen over merging both controls into one dropdown because
   the primary "which library" choice should stay a distinct control.
3. Both controls use **one shared component**, guaranteeing identical styling.

## Design

### 1. Shared component: `MultiSelectDropdown`

Generalize the existing `CombinedFilterDropdown` into `MultiSelectDropdown`
(`src/components/Common/`). It already accepts `groups` / `selectedByGroup` /
`onToggle` / `placeholder` / `ariaLabel`. Used by both controls:

- **Filters:** pass `filterGroups` exactly as today.
- **Library:** pass a single group:
  ```js
  groups={[{
    slug: 'branch',
    name: 'Libraries',
    options: filteredBranches.map(b => ({ slug: b.code, name: b.name })),
  }]}
  ```

Both render an identical `form-select`-styled button + count badge. Style parity is
structural — it is literally the same component.

New optional prop `searchThreshold` (default `8`): the search box renders only when the
total number of options across groups exceeds the threshold. Keeps the small Library
list clean while remaining consistent with the filter dropdown when its lists are long.

### 2. Accessibility upgrades

- Replace the `readOnly` checkbox + `ListGroupItem onClick` with a real `<label>`
  wrapping `<input type="checkbox" onChange={...}>`. Clicking the label toggles; Space
  toggles; screen readers announce checked state correctly.
- Trigger button gains:
  - `aria-haspopup="true"`
  - `aria-controls` referencing the panel's `id`
  - a count-aware `aria-label` (e.g. `"Filter by library, 2 selected"`)
  - keep existing `aria-expanded`
- **Escape** closes the panel and returns focus to the trigger button.
- Keep existing click-outside-to-close and `autoFocus` on the search box (when shown).

### 3. SchoolPage state changes (multi-select libraries)

- `selectedBranch: string` → `selectedBranches: string[]`.
- URL param `branch` becomes comma-separated (`branch=SM01,MH02`). Reading splits on
  comma and filters empties, so existing single-value bookmarks (`branch=SM01`) still
  parse to `['SM01']` (backward compatible). Writing joins with commas; empty array
  deletes the param.
- Branch match in `filteredItems`:
  ```js
  const matchesBranch =
    selectedBranches.length === 0 ||
    itemBranches.some(code => selectedBranches.includes(code));
  ```
- `toggleBranch(code)` (or reuse the generic toggle keyed by `'branch'`) updates the
  array.
- "Clear Filters" resets `selectedBranches` to `[]`.
- "Group by branch" logic already iterates per-branch on `filteredItems`; unaffected.

### 4. Unified chips row

The existing active-filter chips row (`SchoolPage.jsx:629-648`) also renders selected
libraries as removable chips, alongside the custom-filter chips — one consistent place
to view and clear all active selections. Removing a library chip updates
`selectedBranches`.

## Testing

- Unit tests (`node:test`, matching `src/utils/customFilters.test.mjs` style) for:
  - Branch URL serialize/parse, including single-value backward compatibility and
    empty handling.
  - The branch match predicate (no selection = all; some-match semantics).
- Keep selection/serialization logic in pure helpers so it is testable without a DOM
  harness.

## Out of scope

- Group section headers inside the filter panel — it stays a flat searchable list as
  today.
- Any visual redesign beyond making the two controls match.
