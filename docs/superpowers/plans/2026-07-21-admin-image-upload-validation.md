# Admin Image Upload Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject admin inventory images larger than the deployed PHP 2 MiB limit before upload and show useful backend messages for any request failures that still occur.

**Architecture:** Put size validation, Yii/Axios error extraction, and batch-failure formatting in one dependency-free utility that can be tested with the repository's Node assertion pattern. Wire the utility into the existing edit, manual-add, and FOLIO batch-add components while preserving each component's current success and state-management behavior.

**Tech Stack:** React 18, Reactstrap, Axios, React Toastify, Node `assert`, Vite, ESLint

## Global Constraints

- The frontend limit is exactly 2 MiB (2,097,152 bytes), matching the separately managed production `php.ini` setting `upload_max_filesize = 2M`.
- Files exactly 2 MiB are accepted; only larger files are rejected.
- User-facing copy uses `2 MB`: `Image must be 2 MB or smaller.` and `Maximum file size: 2 MB`.
- Changing the frontend constant requires coordinating the production `php.ini` value.
- The backend and PHP configuration are not changed.
- Existing saved-image previews must remain visible when a pending edit image is rejected.
- No new test framework or runtime dependency is introduced.

---

## File Structure

- Create `src/utils/adminImageUploads.js`: pure upload-size validation, safe Yii/Axios error extraction, and batch-failure message formatting.
- Create `src/utils/adminImageUploads.test.mjs`: boundary, response-shape, HTML/length safety, and batch aggregation regression tests.
- Modify `package.json`: include the new test file in the existing Node-based test command.
- Modify `src/components/Admin/tabs/InventoryTab.jsx`: edit-modal selection/pre-submit validation, help text, and API error toast.
- Modify `src/components/Admin/tabs/AddItemTab.jsx`: manual-add selection/pre-submit validation, help text, and API error toast.
- Modify `src/components/Admin/modals/AddItemModal.jsx`: FOLIO batch selection/pre-submit validation, input clearing, server error retention, and aggregate failure toasts.

### Task 1: Shared Upload Rules and Error Formatting

**Files:**
- Create: `src/utils/adminImageUploads.js`
- Create: `src/utils/adminImageUploads.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `MAX_IMAGE_UPLOAD_BYTES: number`
- Produces: `IMAGE_TOO_LARGE_MESSAGE: string`
- Produces: `getImageUploadError(file?: { size: number } | null): string | null`
- Produces: `getApiErrorMessage(error: unknown, fallback: string): string`
- Produces: `buildBatchUploadFailureMessage(successCount: number, failures: Array<{ item: { title?: string }, message: string }>): string`

- [ ] **Step 1: Write the failing utility tests**

Create `src/utils/adminImageUploads.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node src/utils/adminImageUploads.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/utils/adminImageUploads.js`.

- [ ] **Step 3: Implement the minimal shared utility**

Create `src/utils/adminImageUploads.js`:

```js
// Mirrors upload_max_filesize = 2M in the separately managed production php.ini.
// Coordinate changes to this value with the deployment configuration.
export const MAX_IMAGE_UPLOAD_BYTES = 2 * 1024 * 1024;
export const IMAGE_TOO_LARGE_MESSAGE = 'Image must be 2 MB or smaller.';

const MAX_API_ERROR_MESSAGE_LENGTH = 300;
const HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/i;

function normalizeMessage(value) {
  if (typeof value !== 'string') return null;
  const message = value.trim();
  if (!message || message.length > MAX_API_ERROR_MESSAGE_LENGTH || HTML_TAG_PATTERN.test(message)) {
    return null;
  }
  return message;
}

export function getImageUploadError(file) {
  return file?.size > MAX_IMAGE_UPLOAD_BYTES ? IMAGE_TOO_LARGE_MESSAGE : null;
}

export function getApiErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (Array.isArray(data)) {
    const messages = data
      .map((entry) => normalizeMessage(entry?.message))
      .filter(Boolean);
    const uniqueMessages = [...new Set(messages)];
    if (uniqueMessages.length > 0) return uniqueMessages.join(' ');
  }

  const directMessage = normalizeMessage(data?.message);
  if (directMessage) return directMessage;

  return normalizeMessage(data) || fallback;
}

function summarizeItemTitles(failures) {
  const titles = failures
    .slice(0, 3)
    .map(({ item }) => item?.title || 'Unknown item')
    .join(', ');
  return failures.length > 3 ? `${titles}, and ${failures.length - 3} more` : titles;
}

function trimTrailingPeriods(message) {
  return message.replace(/\.+$/, '');
}

export function buildBatchUploadFailureMessage(successCount, failures) {
  const prefix = successCount > 0
    ? `Added ${successCount} item${successCount === 1 ? '' : 's'}; ${failures.length} failed.`
    : 'No items were added.';
  const uniqueMessages = [...new Set(failures.map(({ message }) => message))];

  if (uniqueMessages.length === 1) {
    return `${prefix} ${uniqueMessages[0]} Failed items: ${summarizeItemTitles(failures)}.`;
  }

  const details = failures
    .slice(0, 3)
    .map(({ item, message }) => (
      `${item?.title || 'Unknown item'}: ${trimTrailingPeriods(message)}`
    ))
    .join('; ');
  const remainder = failures.length > 3 ? `; and ${failures.length - 3} more` : '';
  return `${prefix} Failed: ${details}${remainder}.`;
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
node src/utils/adminImageUploads.test.mjs
```

Expected: PASS and print `admin image upload utilities passed`.

- [ ] **Step 5: Add the regression test to the repository test command**

Add the new test to `package.json` without changing the other test entries:

```json
"test": "node src/utils/adminImageUploads.test.mjs && node src/utils/customFilters.test.mjs && node src/utils/authUrls.test.mjs && node src/utils/folioSearch.test.mjs && node src/data/locations.test.mjs && node src/data/branches.test.mjs && node src/utils/branchFilters.test.mjs && node src/utils/multiSelectDropdown.test.mjs"
```

- [ ] **Step 6: Run the complete test command**

Run:

```bash
npm test
```

Expected: exit 0, including `admin image upload utilities passed`.

- [ ] **Step 7: Commit the utility and tests**

```bash
git add package.json src/utils/adminImageUploads.js src/utils/adminImageUploads.test.mjs
git commit -m "Add admin image upload validation utilities"
```

### Task 2: Existing-Item Edit Upload

**Files:**
- Modify: `src/components/Admin/tabs/InventoryTab.jsx`
- Test: `src/utils/adminImageUploads.test.mjs`

**Interfaces:**
- Consumes: `IMAGE_TOO_LARGE_MESSAGE`, `getApiErrorMessage(error, fallback)`, and `getImageUploadError(file)` from Task 1.
- Preserves: the existing `imageSrcs[editableItem.id]` preview until a valid replacement upload succeeds.

- [ ] **Step 1: Import the tested upload utilities and add an input ref**

Change the React import and add utility imports:

```jsx
import { useState, useEffect, useRef } from 'react';
```

```jsx
import {
  getApiErrorMessage,
  getImageUploadError,
} from '../../../utils/adminImageUploads';
```

Add beside the existing image state:

```jsx
const editImageInputRef = useRef(null);
```

- [ ] **Step 2: Validate and clear oversized selections immediately**

Replace `handleImageChange` with:

```jsx
const handleImageChange = (event) => {
  const file = event.target.files?.[0] || null;
  const validationError = getImageUploadError(file);
  if (validationError) {
    event.target.value = '';
    setImageFile(null);
    toast.error(validationError);
    return;
  }
  setImageFile(file);
};
```

- [ ] **Step 3: Add defense-in-depth before update submission**

Immediately after `if (!editableItem) return;` in `handleUpdate`, add:

```jsx
const validationError = getImageUploadError(imageFile);
if (validationError) {
  setImageFile(null);
  if (editImageInputRef.current) editImageInputRef.current.value = '';
  toast.error(validationError);
  return;
}
```

Replace the catch toast with:

```jsx
toast.error(getApiErrorMessage(error, 'Failed to update item.'));
```

- [ ] **Step 4: Connect the ref and add visible limit help**

Replace the hidden input with:

```jsx
<Input
  ref={editImageInputRef}
  type="file"
  hidden
  onChange={handleImageChange}
  accept="image/*"
/>
```

Add immediately after the upload label:

```jsx
<small className="text-muted d-block mt-1">Maximum file size: 2 MB</small>
```

- [ ] **Step 5: Verify the tested rules and compile the component**

Run:

```bash
node src/utils/adminImageUploads.test.mjs
npm run build
```

Expected: both commands exit 0. The build must not report missing imports or JSX errors.

- [ ] **Step 6: Commit the edit flow**

```bash
git add src/components/Admin/tabs/InventoryTab.jsx
git commit -m "Validate admin edit image uploads"
```

### Task 3: Manual Add Upload

**Files:**
- Modify: `src/components/Admin/tabs/AddItemTab.jsx`
- Test: `src/utils/adminImageUploads.test.mjs`

**Interfaces:**
- Consumes: `getApiErrorMessage(error, fallback)` and `getImageUploadError(file)` from Task 1.
- Preserves: the current manual-add success behavior and form reset.

- [ ] **Step 1: Import toast and the tested upload utilities**

Add:

```jsx
import { toast } from 'react-toastify';
import {
  getApiErrorMessage,
  getImageUploadError,
} from '../../../utils/adminImageUploads';
```

- [ ] **Step 2: Validate and clear oversized selections immediately**

Replace `handleImageChange` with:

```jsx
const handleImageChange = (event) => {
  const file = event.target.files?.[0] || null;
  const validationError = getImageUploadError(file);
  if (validationError) {
    event.target.value = '';
    setNewItem((previous) => ({ ...previous, image: null }));
    toast.error(validationError);
    return;
  }
  setNewItem((previous) => ({ ...previous, image: file }));
};
```

- [ ] **Step 3: Add defense-in-depth before constructing the request**

Immediately after `e.preventDefault();` in `handleAddItem`, add:

```jsx
const validationError = getImageUploadError(newItem.image);
if (validationError) {
  setNewItem((previous) => ({ ...previous, image: null }));
  e.currentTarget.elements.file.value = '';
  toast.error(validationError);
  return;
}
```

Replace the catch body with:

```jsx
console.error('Error adding new item:', error);
toast.error(getApiErrorMessage(error, 'Failed to add item.'));
```

- [ ] **Step 4: Add the visible limit to existing image help text**

Replace the help copy with:

```jsx
Supported formats: JPG, PNG, GIF. Maximum file size: 2 MB
```

- [ ] **Step 5: Verify the tested rules and compile the component**

Run:

```bash
node src/utils/adminImageUploads.test.mjs
npm run build
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit the manual-add flow**

```bash
git add src/components/Admin/tabs/AddItemTab.jsx
git commit -m "Validate manual item image uploads"
```

### Task 4: FOLIO Batch Add Uploads and Aggregate Errors

**Files:**
- Modify: `src/components/Admin/modals/AddItemModal.jsx`
- Test: `src/utils/adminImageUploads.test.mjs`

**Interfaces:**
- Consumes: `IMAGE_TOO_LARGE_MESSAGE`, `buildBatchUploadFailureMessage(successCount, failures)`, `getApiErrorMessage(error, fallback)`, and `getImageUploadError(file)` from Task 1.
- Produces rejected results shaped as `{ status: 'rejected', item, message }`.

- [ ] **Step 1: Import refs and the tested upload utilities**

Change the React import and add utility imports:

```jsx
import { useRef, useState } from 'react';
```

```jsx
import {
  buildBatchUploadFailureMessage,
  getApiErrorMessage,
  getImageUploadError,
} from '../../../utils/adminImageUploads';
```

Add with the component state:

```jsx
const imageInputRefs = useRef({});
```

- [ ] **Step 2: Add immediate per-item selection validation**

Add this handler before `handleBatchUpload`:

```jsx
const handleImageChange = (event, itemId) => {
  const file = event.target.files?.[0] || null;
  const validationError = getImageUploadError(file);
  if (validationError) {
    event.target.value = '';
    setSelectedItemsData((previous) => ({
      ...previous,
      [itemId]: { ...previous[itemId], image: null },
    }));
    toast.error(validationError);
    return;
  }
  setSelectedItemsData((previous) => ({
    ...previous,
    [itemId]: { ...previous[itemId], image: file },
  }));
};
```

- [ ] **Step 3: Abort the whole batch if defensive validation finds invalid state**

After the empty-selection warning in `handleBatchUpload`, add:

```jsx
const invalidItems = itemsToUpload.filter(({ image }) => getImageUploadError(image));
if (invalidItems.length > 0) {
  const invalidIds = new Set(invalidItems.map(({ item }) => String(item.id)));
  setSelectedItemsData((previous) => Object.fromEntries(
    Object.entries(previous).map(([itemId, data]) => [
      itemId,
      invalidIds.has(itemId) ? { ...data, image: null } : data,
    ]),
  ));
  invalidIds.forEach((itemId) => {
    if (imageInputRefs.current[itemId]) imageInputRefs.current[itemId].value = '';
  });
  toast.error(getImageUploadError(invalidItems[0].image));
  return;
}
```

- [ ] **Step 4: Retain server messages and use one aggregate toast**

Replace the rejected result in the Axios catch with:

```jsx
return {
  status: 'rejected',
  item: data.item,
  message: getApiErrorMessage(error, 'Failed to add item.'),
};
```

Delete the local `summarizeFailures` function. Replace both failure toast branches with:

```jsx
const failureMessage = buildBatchUploadFailureMessage(successes.length, failures);
if (successes.length > 0) {
  toast.warning(failureMessage);
} else {
  toast.error(failureMessage);
}
```

- [ ] **Step 5: Connect each input ref, handler, accepted type, and help text**

Replace the batch image input cell with:

```jsx
<Input
  ref={(input) => {
    if (input) imageInputRefs.current[String(item.id)] = input;
    else delete imageInputRefs.current[String(item.id)];
  }}
  type="file"
  accept="image/*"
  size="sm"
  className="form-control-sm"
  aria-describedby={`image-help-${item.id}`}
  onChange={(event) => handleImageChange(event, item.id)}
/>
<small id={`image-help-${item.id}`} className="text-muted d-block mt-1">
  Maximum file size: 2 MB
</small>
```

- [ ] **Step 6: Verify batch formatting tests and compile the component**

Run:

```bash
node src/utils/adminImageUploads.test.mjs
npm run build
```

Expected: both commands exit 0, including the shared-message, mixed-message, and partial-success assertions.

- [ ] **Step 7: Commit the batch flow**

```bash
git add src/components/Admin/modals/AddItemModal.jsx
git commit -m "Validate batch image uploads and show API errors"
```

### Task 5: Full Verification and Manual Behavior Check

**Files:**
- Verify: `src/utils/adminImageUploads.js`
- Verify: `src/utils/adminImageUploads.test.mjs`
- Verify: `src/components/Admin/tabs/InventoryTab.jsx`
- Verify: `src/components/Admin/tabs/AddItemTab.jsx`
- Verify: `src/components/Admin/modals/AddItemModal.jsx`
- Verify: `package.json`

**Interfaces:**
- Consumes: all deliverables from Tasks 1–4.
- Produces: verified admin behavior with no production request for rejected oversized files.

- [ ] **Step 1: Run all automated checks**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all three commands exit 0 with no warnings or errors.

- [ ] **Step 2: Run the admin UI locally**

Run:

```bash
npm run dev
```

Expected: Vite starts and prints a local HTTPS URL.

- [ ] **Step 3: Verify the edit flow manually**

In the admin inventory edit modal:

1. Select an image exactly 2,097,152 bytes and confirm it remains selected.
2. Select an image 2,097,153 bytes or larger and confirm the toast reads `Image must be 2 MB or smaller.`
3. Confirm the rejected filename is cleared and the previously saved image preview remains visible.
4. Force or observe a backend validation error and confirm its `message` appears in the toast instead of `Failed to update item.`

- [ ] **Step 4: Verify the add flows manually**

In manual add and FOLIO batch add:

1. Confirm every input displays `Maximum file size: 2 MB`.
2. Confirm an oversized selection is immediately cleared with one error toast.
3. Confirm a defensive invalid batch aborts without sending any item requests and retains selections for correction.
4. Confirm shared batch errors appear once with failed titles, mixed errors pair titles with messages, and partial success includes both the success count and failure context.

- [ ] **Step 5: Review the final diff and commit any verification-only corrections**

Run:

```bash
git diff --check
git status --short
git log -5 --oneline
```

Expected: no whitespace errors; only intentional user-owned untracked files may remain. If verification required code corrections, stage only the files in this plan and commit them with a narrowly scoped message.
