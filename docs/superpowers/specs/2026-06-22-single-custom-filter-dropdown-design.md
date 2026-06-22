# Single custom-filter dropdown (home page)

**Date:** 2026-06-22
**Status:** Approved — ready for implementation plan
**Scope:** Presentation only. No backend, data-model, util, or filtering-logic changes.

## Problem

On the public SchoolPage, each admin-defined filter **group** currently renders as its
own dropdown (`filterGroups.map(... <MultiSelectFilter/> ...)`). So creating more than one
group produces more than one dropdown. The desired behavior: the page must show **exactly
one** custom-filter dropdown regardless of how many groups exist, with each group appearing
as a labeled section inside that single dropdown.

The existing "All Libraries" (service point) dropdown stays separate. Net public layout:
two dropdowns — `[ All Libraries ]  [ All Filters ]`.

## Decision

Approach 1 — a new public-only component, **`CombinedFilterDropdown`**, renders all custom
filter groups inside one dropdown. `MultiSelectFilter` is left exactly as-is for the admin
tabs (`AddItemModal`, `InventoryTab`). The data layer is untouched: selection remains
`selectedCustomFilters = { [groupSlug]: [optionSlug, ...] }`, which `customFilters.js`
already supports for multiple groups (URL params, item matching, chips).

## Design

### New component: `src/components/Common/CombinedFilterDropdown.jsx`

Props:
- `groups` — the normalized `filterGroups` array: `[{ slug, name, options: [{ slug, name }] }]`.
- `selectedByGroup` — `selectedCustomFilters`: `{ [groupSlug]: [optionSlug, ...] }`.
- `onToggle(groupSlug, optionSlug)` — called when an option checkbox is clicked.
- `placeholder` (default `'All Filters'`) — trigger resting label.
- `ariaLabel` — accessible name for the trigger.

Behavior:
- **Trigger button** styled identically to the home-page `MultiSelectFilter` trigger
  (`w-100`, outline secondary, white background, `border`, `text-dark`, chevron on the
  right). When any option across any group is selected, show a primary count Badge (total
  selected count) before the chevron. Resting text is the placeholder.
- **Panel** (same shell as `MultiSelectFilter`: `position-absolute w-100 bg-white border
  rounded shadow-sm`, `zIndex: 2000`, `maxHeight: 240px` scroll): a search box at top, then
  the groups.
- **Sections:** for each group, render its options as checkbox rows (reusing the
  `ListGroupItem` checkbox pattern). A small non-interactive section header showing
  `group.name` appears **only when `groups.length > 1`** (a single group needs no header).
- **Search** filters option rows by name (case-insensitive) across all groups; a group with
  no matching options is hidden; if nothing matches anywhere, show "No matching options".
- **Selection state** per option = `(selectedByGroup[group.slug] || []).includes(option.slug)`.
- Closes on outside click and clears the search term (same as `MultiSelectFilter`).

### `src/pages/SchoolPage.jsx`

- Replace the `filterGroups.map(...)` block of multiple `<MultiSelectFilter>` columns in the
  unified filter row with a **single** `<CombinedFilterDropdown>` column (`Col xs={12}
  sm={6} md`), rendered only when `filterGroups.length > 0`. The branch select column is
  unchanged.
- Add a `toggleCustomFilterValue(groupSlug, optionSlug)` handler that flips one option in
  `selectedCustomFilters` (add if absent, remove if present), passed as `onToggle`.
- Keep `activeCustomChips` and `removeCustomFilterValue` exactly as they are — they already
  aggregate and remove selections across all groups, so the shared chip row keeps working.
- Remove the now-unused `MultiSelectFilter` import from SchoolPage (it stays imported in the
  admin files).

## Out of scope

- Backend, data-model, `customFilters.js`, or filtering-logic changes.
- Folding "All Libraries" into the dropdown (explicitly kept separate).
- Changing the admin Filter Options editing UI (still per-group `MultiSelectFilter`).
- Any rename of existing filter data (admin tidy-up, separate from this work).

## Verification

No React component test harness exists; the gate is `npm run lint` with no new problems,
plus visual verification via the running dev server (Smith page):
- With one group: a single "All Filters" dropdown, no section header, options as checkboxes.
- With two+ groups: one dropdown containing a labeled section per group.
- Selecting options across groups: trigger shows a count badge; chips appear in the shared
  row; chip × removes the right option; the item grid and URL update.
