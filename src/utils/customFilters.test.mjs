import assert from 'node:assert/strict';

import {
  buildCustomFilterQueryParams,
  doesItemMatchSelectedFilters,
  getSelectedCustomFiltersFromQuery,
  normalizeFilterGroups,
  slugifyFilterValue,
} from './customFilters.js';

const groups = normalizeFilterGroups([
  {
    id: 10,
    name: 'Collections',
    sort_order: 2,
    options: [
      { id: 102, name: 'MH Circulation Equipment', sort_order: 2 },
      { id: 101, name: 'MH Media Resources', sort_order: 1 },
    ],
  },
  {
    id: 5,
    name: 'Audience',
    sort_order: 1,
    options: [
      { id: 201, name: 'Advanced users only', sort_order: 1 },
    ],
  },
]);

assert.equal(slugifyFilterValue('MH Media Resources'), 'mh-media-resources');
assert.equal(slugifyFilterValue('  Multiple   Spaces & Symbols! '), 'multiple-spaces-symbols');

assert.deepEqual(
  groups.map((group) => ({
    id: group.id,
    slug: group.slug,
    optionSlugs: group.options.map((option) => option.slug),
  })),
  [
    { id: 5, slug: 'audience', optionSlugs: ['advanced-users-only'] },
    { id: 10, slug: 'collections', optionSlugs: ['mh-media-resources', 'mh-circulation-equipment'] },
  ],
);

const params = new URLSearchParams('filter.collections=mh-media-resources,mh-circulation-equipment&filter.audience=advanced-users-only&filter.unknown=ignored');
assert.deepEqual(getSelectedCustomFiltersFromQuery(params, groups), {
  collections: ['mh-media-resources', 'mh-circulation-equipment'],
  audience: ['advanced-users-only'],
});

const nextParams = buildCustomFilterQueryParams(new URLSearchParams('q=camera&filter.collections=old'), {
  collections: ['mh-media-resources'],
  audience: [],
});
assert.equal(nextParams.toString(), 'q=camera&filter.collections=mh-media-resources');

assert.equal(
  doesItemMatchSelectedFilters(
    { filter_option_ids: [101, 201] },
    { collections: ['mh-media-resources'], audience: ['advanced-users-only'] },
    groups,
  ),
  true,
);

assert.equal(
  doesItemMatchSelectedFilters(
    { filter_option_ids: [101] },
    { collections: ['mh-media-resources'], audience: ['advanced-users-only'] },
    groups,
  ),
  false,
);

assert.equal(
  doesItemMatchSelectedFilters(
    { custom_filters: [{ id: 102 }] },
    { collections: ['mh-media-resources', 'mh-circulation-equipment'] },
    groups,
  ),
  true,
);

console.log('custom filter utilities passed');
