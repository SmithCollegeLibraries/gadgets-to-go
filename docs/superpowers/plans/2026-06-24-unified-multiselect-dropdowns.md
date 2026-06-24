# Unified Multi-Select Dropdowns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "All Libraries" and "All Filters" controls on `SchoolPage` identical multi-select dropdowns sharing one accessible component.

**Architecture:** Generalize the existing `CombinedFilterDropdown` into a reusable `MultiSelectDropdown` used by both controls. The library control passes a single "branch" group. Selection/serialization logic lives in pure, unit-tested helper modules; the React component stays presentational. Libraries become multi-select, stored as an array and serialized to a comma-separated `branch` URL param (backward compatible with the existing single value).

**Tech Stack:** React 18, reactstrap (Bootstrap 5), Vite. Tests are plain `node:test`/`node:assert` `.mjs` files run via `npm test`.

## Global Constraints

- Pure logic goes in `src/utils/*.js` with a matching `*.test.mjs`; add each new test file to the `test` script in `package.json`.
- Tests use `node:assert/strict` and run with bare `node path/to/file.test.mjs` (see `src/utils/customFilters.test.mjs`).
- `npm run lint` must pass with zero warnings (`--max-warnings 0`).
- Branch URL param key stays `branch` (comma-separated for multiple values).
- Do not change the "group by branch" logic — it already iterates per-branch.
- Match existing code style: 2-space indent, single quotes, reactstrap components, PropTypes on components.

---

### Task 1: Branch filter helpers (pure logic)

**Files:**
- Create: `src/utils/branchFilters.js`
- Test: `src/utils/branchFilters.test.mjs`
- Modify: `package.json` (add the test file to the `test` script)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `BRANCH_QUERY_KEY: string` (= `'branch'`)
  - `getSelectedBranchesFromQuery(params: URLSearchParams, allowedCodes?: string[]|null): string[]`
  - `buildBranchQueryParams(existingParams: URLSearchParams, selectedBranches: string[]): URLSearchParams`
  - `doesItemMatchSelectedBranches(item: object, selectedBranches: string[]): boolean`

- [ ] **Step 1: Write the failing test**

Create `src/utils/branchFilters.test.mjs`:

```js
import assert from 'node:assert/strict';

import {
  BRANCH_QUERY_KEY,
  getSelectedBranchesFromQuery,
  buildBranchQueryParams,
  doesItemMatchSelectedBranches,
} from './branchFilters.js';

assert.equal(BRANCH_QUERY_KEY, 'branch');

// Empty / missing param -> empty array
assert.deepEqual(getSelectedBranchesFromQuery(new URLSearchParams('')), []);

// Single value (backward compatible with old single-select bookmarks)
assert.deepEqual(getSelectedBranchesFromQuery(new URLSearchParams('branch=SCNLS')), ['SCNLS']);

// Multiple values, trimmed, empties dropped, de-duplicated
assert.deepEqual(
  getSelectedBranchesFromQuery(new URLSearchParams('branch=SCNLS, MHPSL ,,SCNLS')),
  ['SCNLS', 'MHPSL'],
);

// allowedCodes filters out unknown codes when provided
assert.deepEqual(
  getSelectedBranchesFromQuery(new URLSearchParams('branch=SCNLS,XXXXX'), ['SCNLS', 'MHPSL']),
  ['SCNLS'],
);

// buildBranchQueryParams sets a comma-joined value and preserves other params
const built = buildBranchQueryParams(new URLSearchParams('q=camera'), ['SCNLS', 'MHPSL']);
assert.equal(built.get('q'), 'camera');
assert.equal(built.get('branch'), 'SCNLS,MHPSL');

// Empty selection deletes the param
const cleared = buildBranchQueryParams(new URLSearchParams('q=camera&branch=SCNLS'), []);
assert.equal(cleared.get('q'), 'camera');
assert.equal(cleared.get('branch'), null);

// doesItemMatchSelectedBranches: empty selection matches everything
assert.equal(doesItemMatchSelectedBranches({ branches: ['SCNLS'] }, []), true);

// some-match semantics on the new branches array
assert.equal(doesItemMatchSelectedBranches({ branches: ['MHPSL', 'SCNLS'] }, ['SCNLS']), true);
assert.equal(doesItemMatchSelectedBranches({ branches: ['MHPSL'] }, ['SCNLS']), false);

// backward compatible with the legacy single `branch` field
assert.equal(doesItemMatchSelectedBranches({ branch: 'SCNLS' }, ['SCNLS']), true);

// item with no branch info never matches a non-empty selection
assert.equal(doesItemMatchSelectedBranches({}, ['SCNLS']), false);

console.log('branchFilters tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node src/utils/branchFilters.test.mjs`
Expected: FAIL — `Cannot find module './branchFilters.js'`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/branchFilters.js`:

```js
export const BRANCH_QUERY_KEY = 'branch';

export function getSelectedBranchesFromQuery(params, allowedCodes = null) {
  const raw = params.get(BRANCH_QUERY_KEY);
  if (!raw) return [];

  const allowed = allowedCodes ? new Set(allowedCodes) : null;
  const codes = raw
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean)
    .filter((code) => (allowed ? allowed.has(code) : true));

  return [...new Set(codes)];
}

export function buildBranchQueryParams(existingParams, selectedBranches = []) {
  const params = new URLSearchParams(existingParams);

  const clean = Array.isArray(selectedBranches)
    ? [...new Set(selectedBranches.map((code) => String(code).trim()).filter(Boolean))]
    : [];

  if (clean.length > 0) {
    params.set(BRANCH_QUERY_KEY, clean.join(','));
  } else {
    params.delete(BRANCH_QUERY_KEY);
  }

  return params;
}

export function doesItemMatchSelectedBranches(item, selectedBranches = []) {
  if (!Array.isArray(selectedBranches) || selectedBranches.length === 0) return true;

  const itemBranches = Array.isArray(item?.branches)
    ? item.branches
    : (item?.branch ? [item.branch] : []);

  return itemBranches.some((code) => selectedBranches.includes(code));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node src/utils/branchFilters.test.mjs`
Expected: PASS — prints `branchFilters tests passed`.

- [ ] **Step 5: Register the test in package.json**

In `package.json`, change the `test` script so it also runs the new file. Current:

```
"test": "node src/utils/customFilters.test.mjs && node src/utils/authUrls.test.mjs && node src/utils/folioSearch.test.mjs && node src/data/locations.test.mjs && node src/data/branches.test.mjs",
```

New (append `&& node src/utils/branchFilters.test.mjs`):

```
"test": "node src/utils/customFilters.test.mjs && node src/utils/authUrls.test.mjs && node src/utils/folioSearch.test.mjs && node src/data/locations.test.mjs && node src/data/branches.test.mjs && node src/utils/branchFilters.test.mjs",
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — all suites including `branchFilters tests passed`.

- [ ] **Step 7: Commit**

```bash
git add src/utils/branchFilters.js src/utils/branchFilters.test.mjs package.json
git commit -m "Add branch filter URL + match helpers"
```

---

### Task 2: Dropdown option helpers (pure logic)

**Files:**
- Create: `src/utils/multiSelectDropdown.js`
- Test: `src/utils/multiSelectDropdown.test.mjs`
- Modify: `package.json` (add the test file to the `test` script)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `getSelectedCount(groups: Group[], selectedByGroup: Record<string,string[]>): number`
  - `getMatchingOptions(groups: Group[], searchTerm: string): Array<{ groupSlug: string, option: { slug: string, name: string } }>`
  - where `Group = { slug: string, options: Array<{ slug: string, name: string }> }`

- [ ] **Step 1: Write the failing test**

Create `src/utils/multiSelectDropdown.test.mjs`:

```js
import assert from 'node:assert/strict';

import { getSelectedCount, getMatchingOptions } from './multiSelectDropdown.js';

const groups = [
  { slug: 'branch', options: [{ slug: 'scnls', name: 'Neilson Library' }, { slug: 'mhpsl', name: 'Mount Holyoke Library' }] },
  { slug: 'color', options: [{ slug: 'black', name: 'Black' }, { slug: 'silver', name: 'Silver' }] },
];

// Count sums selections across all groups
assert.equal(getSelectedCount(groups, { branch: ['scnls'], color: ['black', 'silver'] }), 3);
assert.equal(getSelectedCount(groups, {}), 0);

// Empty search returns every option, each tagged with its group slug
const all = getMatchingOptions(groups, '');
assert.equal(all.length, 4);
assert.deepEqual(all[0], { groupSlug: 'branch', option: { slug: 'scnls', name: 'Neilson Library' } });

// Search is case-insensitive and matches across groups
const lib = getMatchingOptions(groups, 'library');
assert.deepEqual(lib.map((m) => m.option.slug), ['scnls', 'mhpsl']);

// No match -> empty array
assert.deepEqual(getMatchingOptions(groups, 'zzz'), []);

console.log('multiSelectDropdown tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node src/utils/multiSelectDropdown.test.mjs`
Expected: FAIL — `Cannot find module './multiSelectDropdown.js'`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/multiSelectDropdown.js`:

```js
export function getSelectedCount(groups = [], selectedByGroup = {}) {
  return groups.reduce((total, group) => (
    total + (selectedByGroup[group.slug] || []).length
  ), 0);
}

export function getMatchingOptions(groups = [], searchTerm = '') {
  const term = String(searchTerm || '').toLowerCase();

  return groups.flatMap((group) => (
    group.options
      .filter((option) => option.name.toLowerCase().includes(term))
      .map((option) => ({ groupSlug: group.slug, option }))
  ));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node src/utils/multiSelectDropdown.test.mjs`
Expected: PASS — prints `multiSelectDropdown tests passed`.

- [ ] **Step 5: Register the test in package.json**

Append `&& node src/utils/multiSelectDropdown.test.mjs` to the `test` script (after the `branchFilters` entry added in Task 1):

```
"test": "node src/utils/customFilters.test.mjs && node src/utils/authUrls.test.mjs && node src/utils/folioSearch.test.mjs && node src/data/locations.test.mjs && node src/data/branches.test.mjs && node src/utils/branchFilters.test.mjs && node src/utils/multiSelectDropdown.test.mjs",
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 7: Commit**

```bash
git add src/utils/multiSelectDropdown.js src/utils/multiSelectDropdown.test.mjs package.json
git commit -m "Add pure helpers for multi-select dropdown options"
```

---

### Task 3: Generalize the component into accessible `MultiSelectDropdown`

**Files:**
- Rename: `src/components/Common/CombinedFilterDropdown.jsx` → `src/components/Common/MultiSelectDropdown.jsx`
- Modify: the renamed file (rewrite component)

**Interfaces:**
- Consumes: `getSelectedCount`, `getMatchingOptions` from `src/utils/multiSelectDropdown.js` (Task 2).
- Produces: default export `MultiSelectDropdown` with props
  `{ groups, selectedByGroup, onToggle(groupSlug, optionSlug), placeholder?, ariaLabel?, searchThreshold? }`.
  `searchThreshold` defaults to `8`; the search box renders only when total option count exceeds it.

- [ ] **Step 1: Rename the file**

Run:
```bash
git mv src/components/Common/CombinedFilterDropdown.jsx src/components/Common/MultiSelectDropdown.jsx
```

- [ ] **Step 2: Rewrite the component**

Replace the entire contents of `src/components/Common/MultiSelectDropdown.jsx` with:

```jsx
import { useEffect, useId, useRef, useState } from 'react';
import { Badge, Input, ListGroup, ListGroupItem } from 'reactstrap';
import PropTypes from 'prop-types';
import { getMatchingOptions, getSelectedCount } from '../../utils/multiSelectDropdown';

function MultiSelectDropdown({
  groups,
  selectedByGroup,
  onToggle,
  placeholder = 'All Filters',
  ariaLabel,
  searchThreshold = 8,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();

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

  const closeAndFocusTrigger = () => {
    setIsOpen(false);
    setSearchTerm('');
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && isOpen) {
      event.stopPropagation();
      closeAndFocusTrigger();
    }
  };

  const isOptionSelected = (groupSlug, optionSlug) => (
    (selectedByGroup[groupSlug] || []).includes(optionSlug)
  );

  const selectedCount = getSelectedCount(groups, selectedByGroup);
  const matchingOptions = getMatchingOptions(groups, searchTerm);
  const totalOptions = groups.reduce((total, group) => total + group.options.length, 0);
  const showSearch = totalOptions > searchThreshold;
  const hasSelection = selectedCount > 0;
  const triggerLabel = ariaLabel || placeholder;
  const accessibleLabel = hasSelection
    ? `${triggerLabel}, ${selectedCount} selected`
    : triggerLabel;

  return (
    <div
      ref={containerRef}
      className="multi-select-filter position-relative"
      onKeyDown={handleKeyDown}
    >
      <button
        ref={buttonRef}
        type="button"
        className="form-select text-start"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls={panelId}
        aria-label={accessibleLabel}
      >
        <span className="text-truncate">{placeholder}</span>
        {hasSelection && <Badge color="primary" pill className="ms-2 align-middle">{selectedCount}</Badge>}
      </button>

      {isOpen && (
        <div
          id={panelId}
          className="position-absolute w-100 bg-white border rounded shadow-sm mt-1"
          style={{ zIndex: 2000 }}
        >
          {showSearch && (
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
          )}
          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {matchingOptions.length > 0 ? (
              <ListGroup flush>
                {matchingOptions.map(({ groupSlug, option }) => (
                  <ListGroupItem
                    key={`${groupSlug}:${option.slug}`}
                    tag="label"
                    action
                    className="d-flex align-items-center gap-2 small mb-0"
                  >
                    <Input
                      type="checkbox"
                      className="mt-0"
                      checked={isOptionSelected(groupSlug, option.slug)}
                      onChange={() => onToggle(groupSlug, option.slug)}
                    />
                    <span>{option.name}</span>
                  </ListGroupItem>
                ))}
              </ListGroup>
            ) : (
              <div className="text-muted small text-center py-2">No matching options</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

MultiSelectDropdown.propTypes = {
  groups: PropTypes.array.isRequired,
  selectedByGroup: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  ariaLabel: PropTypes.string,
  searchThreshold: PropTypes.number,
};

export default MultiSelectDropdown;
```

What changed and why:
- `tag="label"` on `ListGroupItem` + a real `onChange` checkbox (no more `readOnly` + row `onClick`): clicking the row or pressing Space toggles natively, and screen readers announce the checked state.
- Escape closes the panel and returns focus to the trigger button.
- `aria-haspopup`, `aria-controls={panelId}`, and a count-aware `aria-label`.
- Search box renders only when `totalOptions > searchThreshold`.

- [ ] **Step 3: Verify it compiles and lints**

Run: `npm run lint`
Expected: PASS, zero warnings. (`SchoolPage.jsx` still imports the old name — that is fixed in Task 4; lint does not resolve imports, so it passes. If your lint config flags the missing module, proceed to Task 4 and re-run lint there.)

- [ ] **Step 4: Commit**

```bash
git add src/components/Common/MultiSelectDropdown.jsx
git commit -m "Generalize CombinedFilterDropdown into accessible MultiSelectDropdown"
```

---

### Task 4: Wire SchoolPage to multi-select libraries via the shared component

**Files:**
- Modify: `src/pages/SchoolPage.jsx`

**Interfaces:**
- Consumes: `MultiSelectDropdown` (Task 3); `getSelectedBranchesFromQuery`, `buildBranchQueryParams`, `doesItemMatchSelectedBranches` (Task 1).
- Produces: no exported API change.

- [ ] **Step 1: Update imports**

Replace the line:

```jsx
import CombinedFilterDropdown from '../components/Common/CombinedFilterDropdown.jsx';
```

with:

```jsx
import MultiSelectDropdown from '../components/Common/MultiSelectDropdown.jsx';
import {
  getSelectedBranchesFromQuery,
  buildBranchQueryParams,
  doesItemMatchSelectedBranches,
} from '../utils/branchFilters';
```

- [ ] **Step 2: Parse branches from the URL into initial state**

In `getInitialState()` (around `SchoolPage.jsx:108-117`), replace:

```jsx
      branch: params.get('branch') || '',
```

with:

```jsx
      branches: getSelectedBranchesFromQuery(params),
```

Then change the state declaration (around `SchoolPage.jsx:138`) from:

```jsx
  const [selectedBranch, setSelectedBranch] = useState(initialState.branch);
```

to:

```jsx
  const [selectedBranches, setSelectedBranches] = useState(initialState.branches);
```

- [ ] **Step 3: Serialize branches back to the URL**

In the "Sync State to URL" effect (around `SchoolPage.jsx:156-174`), replace:

```jsx
      if (selectedBranch) params.set('branch', selectedBranch); else params.delete('branch');
```

with:

```jsx
      params = buildBranchQueryParams(params, selectedBranches);
```

In that same effect's dependency array (line 174), replace `selectedBranch` with `selectedBranches`.

- [ ] **Step 4: Update the item filter predicate**

In `filteredItems` (around `SchoolPage.jsx:302-312`), replace these three lines:

```jsx
      // Handle both old single branch and new branches array
      const itemBranches = Array.isArray(item.branches) ? item.branches : (item.branch ? [item.branch] : []);
      const matchesBranch = selectedBranch ? itemBranches.includes(selectedBranch) : true;
```

with:

```jsx
      const matchesBranch = doesItemMatchSelectedBranches(item, selectedBranches);
```

In that `useMemo` dependency array (line 312), replace `selectedBranch` with `selectedBranches`.

- [ ] **Step 5: Add branch group config, toggle/remove handlers, and chips**

Immediately after the `removeCustomFilterValue` / `toggleCustomFilterValue` block (ends around `SchoolPage.jsx:359`), add:

```jsx
  const branchGroup = useMemo(() => ([{
    slug: 'branch',
    name: 'Libraries',
    options: filteredBranches.map((b) => ({ slug: b.code, name: b.name })),
  }]), [filteredBranches]);

  const selectedBranchesByGroup = useMemo(() => ({ branch: selectedBranches }), [selectedBranches]);

  const toggleBranchValue = (groupSlug, code) => {
    setSelectedBranches((previous) => (
      previous.includes(code) ? previous.filter((value) => value !== code) : [...previous, code]
    ));
  };

  const removeBranchValue = (code) => {
    setSelectedBranches((previous) => previous.filter((value) => value !== code));
  };

  const activeBranchChips = useMemo(() => (
    selectedBranches.map((code) => {
      const branch = filteredBranches.find((b) => b.code === code);
      return { code, label: branch ? branch.name : code };
    })
  ), [selectedBranches, filteredBranches]);
```

`useMemo` is already imported in this file (used elsewhere) — no import change needed.

- [ ] **Step 6: Replace the native library `<select>` with the shared component**

Replace the branch column block (around `SchoolPage.jsx:600-614`):

```jsx
                  <Col xs={12} sm={6} md>
                    <label htmlFor="branch-filter" className="visually-hidden">Filter by library location</label>
                    <Input
                      id="branch-filter"
                      type="select"
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      aria-label="Filter by library location"
                    >
                      <option value="">All Libraries</option>
                      {filteredBranches.map(b => (
                        <option key={b.id} value={b.code}>{b.name}</option>
                      ))}
                    </Input>
                  </Col>
```

with:

```jsx
                  <Col xs={12} sm={6} md>
                    <MultiSelectDropdown
                      groups={branchGroup}
                      selectedByGroup={selectedBranchesByGroup}
                      onToggle={toggleBranchValue}
                      placeholder="All Libraries"
                      ariaLabel="Filter by library location"
                    />
                  </Col>
```

- [ ] **Step 7: Point the filters column at the renamed component**

In the same row (around `SchoolPage.jsx:615-625`), change the element name from `CombinedFilterDropdown` to `MultiSelectDropdown` (props unchanged):

```jsx
                  {filterGroups.length > 0 && (
                    <Col xs={12} sm={6} md>
                      <MultiSelectDropdown
                        groups={filterGroups}
                        selectedByGroup={selectedCustomFilters}
                        onToggle={toggleCustomFilterValue}
                        placeholder="All Filters"
                        ariaLabel="Filter items"
                      />
                    </Col>
                  )}
```

- [ ] **Step 8: Show library chips in the shared chip row**

Replace the chip-row opening condition and prepend branch chips. Change (around `SchoolPage.jsx:629-630`):

```jsx
                {activeCustomChips.length > 0 && (
                  <div className="d-flex flex-wrap gap-1 mb-3">
```

to:

```jsx
                {(activeBranchChips.length > 0 || activeCustomChips.length > 0) && (
                  <div className="d-flex flex-wrap gap-1 mb-3">
                    {activeBranchChips.map((chip) => (
                      <Badge
                        key={`branch:${chip.code}`}
                        color="light"
                        className="text-dark border d-inline-flex align-items-center gap-1"
                        pill
                      >
                        {chip.label}
                        <button
                          type="button"
                          className="btn-close btn-close-sm"
                          aria-label={`Remove ${chip.label}`}
                          onClick={() => removeBranchValue(chip.code)}
                        />
                      </Badge>
                    ))}
```

(The existing `{activeCustomChips.map(...)}` block and the closing `</div>` stay as-is, now rendered after the branch chips.)

- [ ] **Step 9: Reset libraries in "Clear Filters"**

In the Clear Filters button handler (around `SchoolPage.jsx:727`), replace `setSelectedBranch('')` with `setSelectedBranches([])`:

```jsx
                  <Button color="outline-primary" onClick={() => { setSearchQuery(''); setSelectedBranches([]); setShowAvailableOnly(false); setSelectedCustomFilters({}); }}>Clear Filters</Button>
```

- [ ] **Step 10: Lint and run the suite**

Run: `npm run lint && npm test`
Expected: both PASS. Lint must report no unused `Input`/`selectedBranch` references and zero warnings. (`Input` is still used elsewhere in the file — confirm lint is clean.)

- [ ] **Step 11: Manual verification in the browser**

Run the dev server: `npm run dev`, open a school page (e.g. `/smith`), and confirm:
- "All Libraries" and "All Filters" are visually identical buttons (same height, border, caret).
- Both open a panel of checkboxes; selecting multiple libraries narrows results to items at any selected library.
- Selecting libraries adds removable chips alongside filter chips; removing a chip updates results.
- The `branch` URL param is comma-separated; reloading restores the selection; an old single-value URL (`?branch=SCNLS`) still works.
- Keyboard: Tab to the button, Enter/Space opens it, Tab moves through checkboxes, Space toggles, Escape closes and returns focus to the button.
- "Clear Filters" clears the library selection.

- [ ] **Step 12: Commit**

```bash
git add src/pages/SchoolPage.jsx
git commit -m "Make library filter a multi-select using shared MultiSelectDropdown"
```

---

## Self-Review

- **Spec coverage:**
  - Shared component → Tasks 2 & 3 (`MultiSelectDropdown` + helpers); both controls use it → Task 4 steps 6–7.
  - A11y upgrades (native checkbox, Escape + focus return, aria-haspopup/controls, count-aware label, conditional search) → Task 3 step 2.
  - Multi-select libraries state + comma-separated URL with back-compat → Task 1 + Task 4 steps 2–4.
  - Branch match predicate → Task 1.
  - Unified chips row → Task 4 step 8.
  - Clear Filters reset → Task 4 step 9.
  - Tests for URL serialize/parse + match predicate → Task 1; dropdown logic → Task 2.
  - Out of scope (group headers, visual redesign) → not introduced. ✓
- **Placeholder scan:** none — all steps contain concrete code/commands.
- **Type consistency:** helper names (`getSelectedBranchesFromQuery`, `buildBranchQueryParams`, `doesItemMatchSelectedBranches`, `getSelectedCount`, `getMatchingOptions`) and the `{ slug, options:[{slug,name}] }` group shape are used identically across Tasks 1–4. Component prop names (`groups`, `selectedByGroup`, `onToggle`, `placeholder`, `ariaLabel`, `searchThreshold`) match between Task 3 definition and Task 4 usage. ✓
