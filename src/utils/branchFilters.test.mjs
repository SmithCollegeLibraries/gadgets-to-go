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
