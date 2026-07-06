import assert from 'node:assert/strict';

import { branches } from './branches.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

for (const branch of branches) {
  assert.equal(branch.id, branch.code, `${branch.code} must keep code as its app id`);
  if (branch.folioBranchId) {
    assert.match(
      branch.folioBranchId,
      uuidPattern,
      `${branch.code} must have a valid FOLIO branch UUID`,
    );
  }
}

const idsByCode = new Map(branches.map(branch => [branch.code, branch.folioBranchId]));
const smithBranches = branches.filter(branch => branch.code.startsWith('SC'));

assert.equal(idsByCode.get('SCNLS'), 'd541a5ab-50d8-4822-83fc-8469ddfcbb57');
assert.equal(idsByCode.get('SCANN'), '6bb6c83a-dd37-43dd-bf4d-bea653be401a');
assert.equal(idsByCode.get('SCHIL'), 'b9a3e61b-26cf-4d23-a24a-1e339c61a646');
assert.equal(idsByCode.get('MHPSL'), '0759abd5-6bd1-400d-8960-c2511a1534f0');
assert.equal(idsByCode.get('UMDML'), '81c27a73-97a4-4063-b5cb-d790bfea1e14');
assert.equal(smithBranches.length, 7);

console.log('branch data passed');
