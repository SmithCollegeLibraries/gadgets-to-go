# Custom Filter Display Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin-defined custom filter dropdowns on the public SchoolPage read as one consistent set of controls with the branch dropdown, and move selected values into a single shared chip row so the layout never reflows.

**Architecture:** Pure presentation change in two files. `MultiSelectFilter` gains two backward-compatible props (`ariaLabel`, `showSelectedBadges`) so its admin usages are untouched; the home variant turns badges off and shows an in-trigger count. `SchoolPage` restructures the filter card into: full-width search → unified filter row (branch + custom filters as responsive equal-width columns) → shared removable-chip row → existing controls row.

**Tech Stack:** React 18, Vite, reactstrap (Bootstrap 5), ESLint. Dev server runs at `https://localhost:5173/gadgets-to-go-development/` (HTTPS via mkcert).

## Global Constraints

- No backend, data-model, or filtering-logic changes. `customFilters.js`, `useFetchCustomFilters.js`, and the API layer are not touched.
- `group.name` is displayed verbatim — never auto title-cased or otherwise transformed.
- Admin usages of `MultiSelectFilter` (`AddItemModal.jsx`, `InventoryTab.jsx`) must remain visually and behaviorally unchanged. They pass `label` and rely on the default `showSelectedBadges` behavior.
- No React component test framework exists in this repo. Verification per task is: `npm run lint` (must pass with zero warnings) plus visual confirmation via Playwright screenshots against the running dev server. The Smith page (`/school/smith`) has one custom filter group and is the visual test fixture.

---

### Task 1: Add `ariaLabel` + `showSelectedBadges` props and restyle the trigger in `MultiSelectFilter`

**Files:**
- Modify: `src/components/Common/MultiSelectFilter.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `MultiSelectFilter` now accepts two optional props:
  - `ariaLabel?: string` — accessible name for the trigger button (used when no visible `label` is passed).
  - `showSelectedBadges?: boolean` (default `true`) — when `true`, renders the selected-value badge list below the trigger and fills the trigger primary when selected (current admin behavior). When `false`, the badge list is suppressed and the trigger stays white/outline with an in-trigger count badge.

- [ ] **Step 1: Add the two props to the component signature**

In the destructured props object (currently ending with `placeholder = 'Select options',`), add the two new props:

```jsx
function MultiSelectFilter({
  label,
  options,
  selectedValues,
  onChange,
  idField = 'slug',
  labelField = 'name',
  placeholder = 'Select options',
  ariaLabel,
  showSelectedBadges = true,
}) {
```

- [ ] **Step 2: Replace the `buttonLabel` derivation and the trigger `<Button>`**

Replace this block:

```jsx
  const buttonLabel = selectedOptions.length > 0
    ? `${label}: ${selectedOptions.length}`
    : placeholder;

  return (
    <div ref={containerRef} className="multi-select-filter position-relative">
      {label && <div className="small fw-bold text-secondary mb-1">{label}</div>}
      <Button
        type="button"
        color={selectedOptions.length > 0 ? 'primary' : 'secondary'}
        outline={selectedOptions.length === 0}
        className={`w-100 d-flex justify-content-between align-items-center text-start ${selectedOptions.length === 0 ? 'text-dark bg-white border-secondary' : 'text-white'}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <span className="text-truncate">{buttonLabel}</span>
        <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true"></i>
      </Button>
```

with:

```jsx
  const hasSelection = selectedOptions.length > 0;
  const filled = showSelectedBadges && hasSelection;
  const buttonLabel = hasSelection && label
    ? `${label}: ${selectedOptions.length}`
    : placeholder;

  return (
    <div ref={containerRef} className="multi-select-filter position-relative">
      {label && <div className="small fw-bold text-secondary mb-1">{label}</div>}
      <Button
        type="button"
        color={filled ? 'primary' : 'secondary'}
        outline={!filled}
        className={`w-100 d-flex justify-content-between align-items-center text-start ${filled ? 'text-white' : `text-dark bg-white ${showSelectedBadges ? 'border-secondary' : 'border'}`}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={ariaLabel || label || placeholder}
      >
        <span className="text-truncate">{buttonLabel}</span>
        <span className="d-flex align-items-center gap-2 flex-shrink-0">
          {!showSelectedBadges && hasSelection && (
            <Badge color="primary" pill>{selectedOptions.length}</Badge>
          )}
          <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true"></i>
        </span>
      </Button>
```

- [ ] **Step 3: Gate the below-trigger badge list on `showSelectedBadges`**

Replace this opening condition:

```jsx
      {selectedOptions.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mt-2">
```

with:

```jsx
      {showSelectedBadges && selectedOptions.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mt-2">
```

- [ ] **Step 4: Add the new props to `propTypes`**

In the `MultiSelectFilter.propTypes` object, add after `placeholder: PropTypes.string,`:

```jsx
  ariaLabel: PropTypes.string,
  showSelectedBadges: PropTypes.bool,
```

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: PASS (exit 0, no warnings). `Badge` is already imported at the top of the file, so no import change is needed.

- [ ] **Step 6: Commit**

```bash
git add src/components/Common/MultiSelectFilter.jsx
git commit -m "Add ariaLabel + showSelectedBadges props to MultiSelectFilter"
```

---

### Task 2: Restructure the SchoolPage filter card (unified row + shared chip row)

**Files:**
- Modify: `src/pages/SchoolPage.jsx`

**Interfaces:**
- Consumes: `MultiSelectFilter` with `ariaLabel` and `showSelectedBadges={false}` (from Task 1).
- Produces: no exported interface change.

- [ ] **Step 1: Add the active-chip derivation and remove handler**

Immediately after the `groupedItems` `useMemo` block (ends around line 331, before `// Handlers`), add:

```jsx
  // Flatten selected custom-filter values into removable chips for the shared chip row
  const activeCustomChips = useMemo(() => (
    filterGroups.flatMap((group) => {
      const selected = selectedCustomFilters[group.slug] || [];
      return selected.map((value) => {
        const option = group.options.find((opt) => opt.slug === value);
        return { groupSlug: group.slug, value, label: option ? option.name : value };
      });
    })
  ), [filterGroups, selectedCustomFilters]);

  const removeCustomFilterValue = (groupSlug, value) => {
    setSelectedCustomFilters((previous) => ({
      ...previous,
      [groupSlug]: (previous[groupSlug] || []).filter((selected) => selected !== value),
    }));
  };
```

- [ ] **Step 2: Replace the search/branch row, the custom-filter row, and add the chip row**

Replace this entire block (currently lines ~550–604, from the Row-1 comment through the close of the `filterGroups.length > 0` block):

```jsx
                {/* Row 1: Search and Filter */}
                <Row className="g-3 align-items-center mb-3">
                  <Col md={8}>
                    <div role="search">
                      <label htmlFor="search-input" className="visually-hidden">Search gadgets and equipment</label>
                      <InputGroup>
                        <InputGroupText className="bg-white border-end-0" aria-hidden="true"><i className="bi bi-search text-dark"></i></InputGroupText>
                        <Input
                          id="search-input"
                          className="border-start-0 ps-0"
                          placeholder="Search gadgets, equipment..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          aria-label="Search gadgets and equipment"
                          type="search"
                        />
                      </InputGroup>
                    </div>
                  </Col>
                  <Col md={4}>
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
                </Row>

                {filterGroups.length > 0 && (
                  <Row className="g-3 align-items-start mb-3">
                    {filterGroups.map((group) => (
                      <Col md={4} key={group.id}>
                        <MultiSelectFilter
                          label={group.name}
                          options={group.options}
                          selectedValues={selectedCustomFilters[group.slug] || []}
                          onChange={(selectedValues) => {
                            setSelectedCustomFilters((previous) => ({
                              ...previous,
                              [group.slug]: selectedValues,
                            }));
                          }}
                          placeholder={`All ${group.name}`}
                        />
                      </Col>
                    ))}
                  </Row>
                )}
```

with:

```jsx
                {/* Row 1: Search (full width) */}
                <Row className="g-3 mb-3">
                  <Col xs={12}>
                    <div role="search">
                      <label htmlFor="search-input" className="visually-hidden">Search gadgets and equipment</label>
                      <InputGroup>
                        <InputGroupText className="bg-white border-end-0" aria-hidden="true"><i className="bi bi-search text-dark"></i></InputGroupText>
                        <Input
                          id="search-input"
                          className="border-start-0 ps-0"
                          placeholder="Search gadgets, equipment..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          aria-label="Search gadgets and equipment"
                          type="search"
                        />
                      </InputGroup>
                    </div>
                  </Col>
                </Row>

                {/* Row 2: Unified filter row — branch + custom filters as equal-width columns */}
                <Row className="g-3 mb-3">
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
                </Row>

                {/* Active custom-filter chips — shared row keeps the controls from reflowing */}
                {activeCustomChips.length > 0 && (
                  <div className="d-flex flex-wrap gap-1 mb-3">
                    {activeCustomChips.map((chip) => (
                      <Badge
                        key={`${chip.groupSlug}:${chip.value}`}
                        color="light"
                        className="text-dark border d-inline-flex align-items-center gap-1"
                        pill
                      >
                        {chip.label}
                        <button
                          type="button"
                          className="btn-close btn-close-sm"
                          aria-label={`Remove ${chip.label}`}
                          onClick={() => removeCustomFilterValue(chip.groupSlug, chip.value)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
```

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS (exit 0, no warnings). `Badge`, `Row`, `Col`, `Input`, `InputGroup`, `InputGroupText`, and `useMemo` are all already imported in `SchoolPage.jsx`.

- [ ] **Step 4: Visual verification — resting state (no selection)**

With the dev server running, navigate to `https://localhost:5173/gadgets-to-go-development/school/smith` and screenshot the filter card.

Expected:
- Search box spans the full width on its own row.
- Below it, "All Libraries" and "All circulating-collection" sit side by side as equal-width columns, same height, same white background and light border, each with a chevron on the right. No bold gray slug label floats above the custom filter.
- The Grid/Table, Available Only, Group by Library controls row is unchanged.

- [ ] **Step 5: Visual verification — selected state (chip row, no reflow)**

Open the "All circulating-collection" dropdown, check one or more options, then close it and screenshot.

Expected:
- The trigger stays white/outline and shows a small count badge next to the chevron; its resting text still reads "All circulating-collection".
- Removable chips for each selected option appear in a single row directly beneath the filter row.
- The controls row sits directly below the chip row and did not jump position relative to the filter row as selections were made.
- Clicking a chip's × removes that value (chip disappears; if it was the last one, the chip row disappears and the item grid updates).

- [ ] **Step 6: Commit**

```bash
git add src/pages/SchoolPage.jsx
git commit -m "Unify custom filter row and add shared chip row on SchoolPage"
```

---

## Notes for the implementer

- The dev server is already running (vite, port 5173, HTTPS). If it is not, start it with `npm run dev` and use the `VITE_BASE_URL` printed base path.
- Mount Holyoke (`/school/mtholyoke`) has **no** custom filter groups, so its filter row will show only "All Libraries" — that is expected and is a good check that the layout degrades cleanly to a single control.
- Do not touch `AddItemModal.jsx` or `InventoryTab.jsx`; their `MultiSelectFilter` usage keeps the visible `label` and default badges by relying on `showSelectedBadges`'s `true` default.
