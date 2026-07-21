# Admin Image Upload Validation Design

## Goal

Give administrators immediate, specific feedback when an uploaded image exceeds the server's 2 MiB limit, and surface useful API error messages when a request still fails.

## Scope

The behavior applies consistently to every admin inventory image upload flow:

- editing an existing inventory item;
- manually adding an inventory item; and
- batch-adding FOLIO inventory items.

The backend and PHP upload limits are not changed. Images exactly 2 MiB are accepted; images larger than 2 MiB are rejected.

## Design

Create a small shared utility that owns upload rules and API error extraction. It will expose the 2 MiB byte limit, validate a selected file, and return a stable user-facing message for oversized images. It will also extract a useful message from an Axios error response while accepting a caller-provided fallback.

Each image input will validate its selected file before placing it in React state. When a file is too large, the handler will clear the input and related file state, then show an error toast reading `Image must be 2 MB or smaller.` No upload request will be made with that file.

Each upload flow will also validate its current file immediately before submission as defense in depth. This protects against stale or programmatically supplied state without replacing the backend's authoritative validation.

Every image input will display `Maximum file size: 2 MB` in its help text. Existing accepted image formats and unrelated form behavior remain unchanged.

## API Error Handling

Upload request failures will prefer a useful message supplied by the API. The extractor will support:

- a string response body;
- `response.data.message`; and
- common nested message values returned by API error serializers.

Empty or non-string values will be ignored. When the response contains no useful message, each flow will retain an operation-specific fallback such as `Failed to update item.`

For batch uploads, rejected results will retain the extracted error message. A completely failed batch will show the server message when all failures share it; mixed failures will keep the existing item summary while including useful error context without producing a toast for every request.

## Testing

Focused unit tests will cover:

- a file exactly 2 MiB being accepted;
- a file one byte above 2 MiB being rejected with the expected message;
- missing files being accepted as optional;
- extraction of string, direct-message, and nested API responses; and
- fallback behavior when the API supplies no useful message.

The existing test command, lint command, and production build will be run after implementation. Manual verification will confirm that selecting an oversized image clears the input, displays the toast, and leaves submission available for the remaining form data without uploading the rejected file.

## Non-Goals

- Raising or changing PHP or backend upload limits.
- Client-side image compression or resizing.
- Changing supported image formats.
- Refactoring unrelated admin request handling.
