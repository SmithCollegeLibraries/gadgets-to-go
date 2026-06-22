# Single Custom-Filter Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render all admin-defined custom filter groups inside a single "All Filters" dropdown on the public SchoolPage (each group a labeled section), instead of one dropdown per group.

**Architecture:** A new public-only component `CombinedFilterDropdown` renders every group's options as checkbox rows inside one dropdown, with a per-group section header shown only when there is more than one group. SchoolPage swaps its per-group `MultiSelectFilter` columns for this single component and adds a per-option toggle handler. The selection model (`selectedCustomFilters = { [groupSlug]: [optionSlug] }`) and all of `customFilters.js` are unchanged — they already support multi-group selection.

**Tech Stack:** React 18, Vite, reactstrap (Bootstrap 5), ESLint. Dev server: `https://localhost:5173/gadgets-to-go-development/` (HTTPS via mkcert).

## Global Constraints

- Presentation only. No backend, data-model, `customFilters.js`, or filtering-logic changes.
- `MultiSelectFilter.jsx` must NOT be modified — it stays the admin component (`AddItemModal`, `InventoryTab`).
- The "All Libraries" branch select stays a separate, unchanged dropdown.
- Group/option names are displayed verbatim — never transformed.
- Exactly one custom-filter dropdown on the public page regardless of group count. Section header per group appears only when `groups.length > 1`.
- No React component test framework exists; the gate is `npm run lint` with no NEW problems, plus visual verification on the running dev server. (SchoolPage.jsx has one pre-existing `react-hooks/exhaustive-deps` warning at line ~282 in untouched code — that single warning is the accepted baseline.)

---

### Task 1: Create the `CombinedFilterDropdown` component

**Files:**
- Create: `src/components/Common/CombinedFilterDropdown.jsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: a default-exported React component `CombinedFilterDropdown` with props:
  - `groups: Array<{ slug: string, name: string, options: Array<{ slug: string, name: string }> }>`
  - `selectedByGroup: { [groupSlug: string]: string[] }` (arrays of selected option slugs)
  - `onToggle: (groupSlug: string, optionSlug: string) => void`
  - `placeholder?: string` (default `'All Filters'`)
  - `ariaLabel?: string`

- [ ] **Step 1: Create the component file**

Create `src/components/Common/CombinedFilterDropdown.jsx` with exactly this content:

```jsx
import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Input, ListGroup, ListGroupItem } from 'reactstrap';
import PropTypes from 'prop-types';

function CombinedFilterDropdown({
  groups,
  selectedByGroup,
  onToggle,
  placeholder = 'All Filters',
  ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isOptionSelected = (groupSlug, optionSlug) => (
    (selectedByGroup[groupSlug] || []).includes(optionSlug)
  );

  const selectedCount = groups.reduce((total, group) => (
    total + (selectedByGroup[group.slug] || []).length
  ), 0);

  const term = searchTerm.toLowerCase();
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      options: group.options.filter((option) => option.name.toLowerCase().includes(term)),
    }))
    .filter((group) => group.options.length > 0);

  const showHeaders = groups.length > 1;
  const hasSelection = selectedCount > 0;

  return (
    <div ref={containerRef} className="multi-select-filter position-relative">
      <Button
        type="button"
        color="secondary"
        outline
        className="w-100 d-flex justify-content-between align-items-center text-start text-dark bg-white border"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
      >
        <span className="text-truncate">{placeholder}</span>
        <span className="d-flex align-items-center gap-2 flex-shrink-0">
          {hasSelection && <Badge color="primary" pill>{selectedCount}</Badge>}
          <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true"></i>
        </span>
      </Button>

      {isOpen && (
        <div className="position-absolute w-100 bg-white border rounded shadow-sm mt-1" style={{ zIndex: 2000 }}>
          <div className="p-2 border-bottom">
            <Input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search options..."
              bsSize="sm"
              autoFocus
            />
          </div>
          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {visibleGroups.length > 0 ? (
              visibleGroups.map((group) => (
                <div key={group.slug}>
                  {showHeaders && (
                    <div className="px-3 pt-2 pb-1 small fw-bold text-secondary text-uppercase">
                      {group.name}
                    </div>
                  )}
                  <ListGroup flush>
                    {group.options.map((option) => (
                      <ListGroupItem
                        key={`${group.slug}:${option.slug}`}
                        action
                        className="d-flex align-items-center gap-2 small"
                        onClick={() => onToggle(group.slug, option.slug)}
                      >
                        <Input
                          type="checkbox"
                          checked={isOptionSelected(group.slug, option.slug)}
                          readOnly
                          aria-label={option.name}
                        />
                        <span>{option.name}</span>
                      </ListGroupItem>
                    ))}
                  </ListGroup>
                </div>
              ))
            ) : (
              <div className="text-muted small text-center py-2">No matching options</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

CombinedFilterDropdown.propTypes = {
  groups: PropTypes.array.isRequired,
  selectedByGroup: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  ariaLabel: PropTypes.string,
};

export default CombinedFilterDropdown;
```

- [ ] **Step 2: Run lint on the new file**

Run: `npx eslint src/components/Common/CombinedFilterDropdown.jsx`
Expected: exit 0, no errors and no warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/Common/CombinedFilterDropdown.jsx
git commit -m "Add CombinedFilterDropdown for single grouped filter dropdown"
```

---

### Task 2: Wire `CombinedFilterDropdown` into SchoolPage

**Files:**
- Modify: `src/pages/SchoolPage.jsx`

**Interfaces:**
- Consumes: `CombinedFilterDropdown` (default export from Task 1) with props `groups`, `selectedByGroup`, `onToggle`, `placeholder`, `ariaLabel`.
- Produces: no exported interface change.

- [ ] **Step 1: Swap the component import**

Replace this line (currently line 13):

```jsx
import MultiSelectFilter from '../components/Common/MultiSelectFilter.jsx';
```

with:

```jsx
import CombinedFilterDropdown from '../components/Common/CombinedFilterDropdown.jsx';
```

- [ ] **Step 2: Add the per-option toggle handler**

Immediately after the `removeCustomFilterValue` function (which ends just before the `// Handlers` comment, around line 349), add:

```jsx
  const toggleCustomFilterValue = (groupSlug, optionSlug) => {
    setSelectedCustomFilters((previous) => {
      const current = previous[groupSlug] || [];
      const next = current.includes(optionSlug)
        ? current.filter((value) => value !== optionSlug)
        : [...current, optionSlug];
      return { ...previous, [groupSlug]: next };
    });
  };
```

- [ ] **Step 3: Replace the per-group dropdown map with the single dropdown**

Replace this block (currently lines 605-621):

```jsx
                  {filterGroups.map((group) => (
                    <Col xs={12} sm={6} md key={group.id}>
                      <MultiSelectFilter
                        ariaLabel={`Filter by ${group.name}`}
                        options={group.options}
                        selectedValues={selectedCustomFilters[group.slug] || []}
                        onChange={(selectedValues) => {
                          setSelectedCustomFilters((previous) => ({
                            ...previous,
                            [group.slug]: selectedValues,
                          }));
                        }}
                        placeholder={`All ${group.name}`}
                        showSelectedBadges={false}
                      />
                    </Col>
                  ))}
```

with:

```jsx
                  {filterGroups.length > 0 && (
                    <Col xs={12} sm={6} md>
                      <CombinedFilterDropdown
                        groups={filterGroups}
                        selectedByGroup={selectedCustomFilters}
                        onToggle={toggleCustomFilterValue}
                        placeholder="All Filters"
                        ariaLabel="Filter items"
                      />
                    </Col>
                  )}
```

- [ ] **Step 4: Run lint on the changed file**

Run: `npx eslint src/pages/SchoolPage.jsx`
Expected: exactly one warning — the pre-existing `react-hooks/exhaustive-deps` at line ~282 (`availability`/`fetchItemAvailability`). No errors, and no other warnings. (Confirm `MultiSelectFilter` is no longer referenced, so no `no-unused-vars` error appears.)

- [ ] **Step 5: Visual verification — single group (live Smith data)**

With the dev server running, navigate to `https://localhost:5173/gadgets-to-go-development/school/smith` and screenshot the filter card.

Expected:
- The unified filter row shows two dropdowns: "All Libraries" and "All Filters".
- Opening "All Filters" shows the search box and the single group's options as checkboxes, with **no** section header (only one group).
- Checking an option: the trigger shows a count badge; a removable chip appears in the shared row beneath; the chip's × clears it; the item grid and URL (`filter.<groupSlug>=<optionSlug>`) update.

- [ ] **Step 6: Visual verification — multiple groups (temporary, reverted)**

To exercise the section-header path without touching committed data, make a TEMPORARY edit to `src/pages/SchoolPage.jsx`: directly before the unified filter row's `<Row>` (line ~589), inject a second mock group for local rendering only by temporarily replacing `groups={filterGroups}` in the `CombinedFilterDropdown` with:

```jsx
                        groups={[...filterGroups, { id: 'mock', slug: 'format', name: 'Format', options: [{ id: 9001, slug: 'kit', name: 'Kit' }, { id: 9002, slug: 'cable', name: 'Cable' }] }]}
```

Reload the Smith page and open "All Filters".

Expected: two sections appear, each with its `group.name` as an uppercase header ("CIRCULATING-COLLECTION" / "FORMAT"), options listed under each; the search box filters across both and hides an emptied section.

Then REVERT that one-line change back to `groups={filterGroups}` and confirm with `git diff src/pages/SchoolPage.jsx` that only the Task 2 changes remain (no `mock`/`format` text).

- [ ] **Step 7: Commit**

```bash
git add src/pages/SchoolPage.jsx
git commit -m "Render all custom filter groups in one dropdown on SchoolPage"
```

---

## Notes for the implementer

- The dev server is already running (vite, port 5173, HTTPS). If not, start it with `npm run dev`.
- Mount Holyoke (`/school/mtholyoke`) has no custom filter groups, so it shows only "All Libraries" — expected (the `filterGroups.length > 0` guard hides the custom dropdown).
- Do NOT modify `MultiSelectFilter.jsx`, `customFilters.js`, or any admin file.
- `Badge`, `Row`, `Col`, `Input`, and `useMemo` are already imported in SchoolPage.jsx; only the component import line changes.
