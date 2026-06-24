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
