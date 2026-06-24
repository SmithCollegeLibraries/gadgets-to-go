import assert from 'node:assert/strict';

import { getSelectedCount, getMatchingGroups } from './multiSelectDropdown.js';

const groups = [
  { slug: 'branch', name: 'Libraries', options: [{ slug: 'scnls', name: 'Neilson Library' }, { slug: 'mhpsl', name: 'Mount Holyoke Library' }] },
  { slug: 'color', name: 'Color', options: [{ slug: 'black', name: 'Black' }, { slug: 'silver', name: 'Silver' }] },
];

// Count sums selections across all groups
assert.equal(getSelectedCount(groups, { branch: ['scnls'], color: ['black', 'silver'] }), 3);
assert.equal(getSelectedCount(groups, {}), 0);

// Empty search returns every group with all its options, group metadata preserved
const all = getMatchingGroups(groups, '');
assert.equal(all.length, 2);
assert.equal(all[0].slug, 'branch');
assert.equal(all[0].name, 'Libraries');
assert.deepEqual(all[0].options.map((o) => o.slug), ['scnls', 'mhpsl']);

// Search is case-insensitive, filters options within each group, and drops empty groups
const lib = getMatchingGroups(groups, 'library');
assert.equal(lib.length, 1);
assert.equal(lib[0].slug, 'branch');
assert.deepEqual(lib[0].options.map((o) => o.slug), ['scnls', 'mhpsl']);

// A search that matches options in multiple groups keeps both groups
const black = getMatchingGroups(groups, 'b');
assert.deepEqual(black.map((g) => g.slug), ['branch', 'color']);

// No match -> empty array
assert.deepEqual(getMatchingGroups(groups, 'zzz'), []);

console.log('multiSelectDropdown tests passed');
