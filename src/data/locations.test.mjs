import assert from 'node:assert/strict';

import { locations } from './locations.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

for (const location of locations) {
  assert.match(
    location.folioLocationId,
    uuidPattern,
    `${location.code} must have a FOLIO location UUID`,
  );
}

const idsByCode = new Map(locations.map(location => [location.code, location.folioLocationId]));
const smithLocations = locations.filter(location => location.name.startsWith('SC '));

assert.equal(idsByCode.get('MQEQU'), '57148fe4-7cf3-47fd-9a3e-0d95db4c1497');
assert.equal(idsByCode.get('SCNEQ'), '13b5a7d0-aaaa-479a-8843-6025b2799014');
assert.equal(idsByCode.get('SXSTK'), '5eb79fcc-af08-4ae1-9ab3-dde11e330a01');
assert.equal(idsByCode.get('SCSTA'), 'c7f00299-36ed-4a20-ba2d-90fd0abe3898');
assert.equal(idsByCode.get('UMDIG'), '37a92017-9861-44cf-ac2d-431b6569133d');
assert.equal(smithLocations.length, 93);

console.log('location data passed');
