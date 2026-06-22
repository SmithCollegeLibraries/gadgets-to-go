# Lint Cleanup Tasks

Generated from `npm run lint` on 2026-06-22 after adding the missing
`eslint-plugin-unused-imports` dependency.

## Task List

- [ ] Fix `src/components/Admin/tabs/AddItemTab.jsx` parse error at line 96.
  - Current error: `Parsing error: Expecting Unicode escape sequence \uXXXX`.
  - This blocks reliable linting for that file.
- [ ] Remove unused imports and variables.
  - `src/App.jsx`: unused `Link`.
  - `src/components/Admin/SaveChangesButton.jsx`: unused `React`, unused `localInventoryData`.
  - `src/components/Admin/tabs/BranchManagementTab.jsx`: unused `Label`.
  - `src/components/Admin/tabs/InventoryTab.jsx`: unused `CardText`, `locations`, `setLocalInventoryData`, `isSearching`, `setIsSearching`, `batchBranch`, `setBatchBranch`, `moveItem`, `handleSortChange`, `applySmartSort`.
  - `src/hooks/useTokenValidation.js`: unused `navigate`.
  - `src/pages/Home.jsx`: unused `React`.
- [ ] Add missing PropTypes or relax the rule where appropriate.
  - `src/components/Admin/SaveChangesButton.jsx`: props are missing validation.
  - `src/components/Admin/tabs/InventoryTab.jsx`: nested `SortableRow` props and item fields are missing validation.
  - `src/components/SchoolCard.jsx`: props are missing validation.
- [ ] Fix unescaped entities in `src/components/StaffLogin.jsx`.
  - Escape apostrophes and quotation marks in JSX text.
- [ ] Review React hook dependency warnings.
  - `src/components/Admin/tabs/BranchManagementTab.jsx`: `fetchEnabledItems`.
  - `src/components/Admin/tabs/InventoryTab.jsx`: image-loading effect dependencies.
  - `src/components/Admin/tabs/UserManagementTab.jsx`: `fetchUsers`.
  - `src/pages/SchoolPage.jsx`: availability loading effect dependencies.
- [ ] Re-run `npm run lint` after each cleanup group and keep changes behavior-preserving.

## Notes

These lint failures pre-date the custom filter feature. The new custom-filter utility,
API, hook, shared multi-select component, and Filter Options admin tab pass targeted
ESLint checks.
