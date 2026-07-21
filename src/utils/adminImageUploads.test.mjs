import assert from 'node:assert/strict';

import {
  IMAGE_TOO_LARGE_MESSAGE,
  MAX_IMAGE_UPLOAD_BYTES,
  buildBatchUploadFailureMessage,
  getApiErrorMessage,
  getImageUploadError,
} from './adminImageUploads.js';

assert.equal(MAX_IMAGE_UPLOAD_BYTES, 2 * 1024 * 1024);
assert.equal(getImageUploadError(null), null);
assert.equal(getImageUploadError({ size: MAX_IMAGE_UPLOAD_BYTES }), null);
assert.equal(
  getImageUploadError({ size: MAX_IMAGE_UPLOAD_BYTES + 1 }),
  IMAGE_TOO_LARGE_MESSAGE,
);

assert.equal(
  getApiErrorMessage({ response: { data: 'Upload rejected.' } }, 'Fallback.'),
  'Upload rejected.',
);
assert.equal(
  getApiErrorMessage({ response: { data: { message: 'Uploaded image is too large.' } } }, 'Fallback.'),
  'Uploaded image is too large.',
);
assert.equal(
  getApiErrorMessage({
    response: {
      data: [
        { field: 'image', message: 'Image is invalid.' },
        { field: 'image', message: 'Image is invalid.' },
        { field: 'title', message: 'Title is required.' },
      ],
    },
  }, 'Fallback.'),
  'Image is invalid. Title is required.',
);
assert.equal(
  getApiErrorMessage({ response: { data: '<html><h1>413 Request Entity Too Large</h1></html>' } }, 'Fallback.'),
  'Fallback.',
);
assert.equal(
  getApiErrorMessage({ response: { data: 'x'.repeat(301) } }, 'Fallback.'),
  'Fallback.',
);
assert.equal(getApiErrorMessage({ response: { data: {} } }, 'Fallback.'), 'Fallback.');

const sharedFailures = [
  { item: { title: 'Camera' }, message: 'Uploaded image is too large.' },
  { item: { title: 'Tripod' }, message: 'Uploaded image is too large.' },
  { item: { title: 'Recorder' }, message: 'Uploaded image is too large.' },
  { item: { title: 'Microphone' }, message: 'Uploaded image is too large.' },
];
assert.equal(
  buildBatchUploadFailureMessage(0, sharedFailures),
  'No items were added. Uploaded image is too large. Failed items: Camera, Tripod, Recorder, and 1 more.',
);

assert.equal(
  buildBatchUploadFailureMessage(0, [
    { item: { title: 'Camera' }, message: 'Uploaded image is too large.' },
    { item: { title: 'Tripod' }, message: 'FOLIO ID already exists.' },
  ]),
  'No items were added. Failed: Camera: Uploaded image is too large; Tripod: FOLIO ID already exists.',
);

assert.equal(
  buildBatchUploadFailureMessage(1, [
    { item: { title: 'Tripod' }, message: 'FOLIO ID already exists.' },
  ]),
  'Added 1 item; 1 failed. FOLIO ID already exists. Failed items: Tripod.',
);

console.log('admin image upload utilities passed');
