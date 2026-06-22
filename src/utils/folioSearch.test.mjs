import assert from 'node:assert/strict';

import {
  buildFolioInventorySearchUrl,
  getLocationUuid,
  isUuidLike,
} from './folioSearch.js';

assert.equal(isUuidLike('588385a6-da11-4fd1-b56c-bdca5b78f096'), true);
assert.equal(isUuidLike('MQEQU'), false);
assert.equal(isUuidLike(undefined), false);

assert.equal(
  getLocationUuid({ id: '588385a6-da11-4fd1-b56c-bdca5b78f096', code: 'MQEQU' }),
  '588385a6-da11-4fd1-b56c-bdca5b78f096',
);

assert.equal(getLocationUuid({ id: 'MQEQU', code: 'MQEQU' }), '');

assert.equal(
  buildFolioInventorySearchUrl('location', {
    locationId: '588385a6-da11-4fd1-b56c-bdca5b78f096',
  }),
  'https://libtools2.smith.edu/folio/web/search/search-inventory?query=(items.effectiveLocationId=="588385a6-da11-4fd1-b56c-bdca5b78f096")',
);

assert.throws(
  () => buildFolioInventorySearchUrl('location', { locationId: 'MQEQU' }),
  /FOLIO location UUID/,
);

console.log('folio search utilities passed');
