# Admin Image Upload Validation Design

## Goal

Give administrators immediate, specific feedback when an uploaded image exceeds the server's 2 MiB limit, and surface useful API error messages when a request still fails.

## Scope

The behavior applies consistently to every admin inventory image upload flow:

- editing an existing inventory item;
- manually adding an inventory item; and
- batch-adding FOLIO inventory items.

The production deployment's separately managed `php.ini` has been verified to set `upload_max_filesize = 2M`. The frontend limit deliberately mirrors that deployment setting; changing either limit requires changing both. This work does not change the backend or PHP configuration. Images exactly 2 MiB are accepted; images larger than 2 MiB are rejected.

## Design

Create a small shared utility that owns upload rules and API error extraction. It will expose the 2 MiB byte limit, validate a selected file, and return a stable user-facing message for oversized images. It will also extract a useful message from an Axios error response while accepting a caller-provided fallback.

Each image input will validate its selected file before placing it in React state. When a file is too large, the handler will clear the input and pending file state, then show an error toast reading `Image must be 2 MB or smaller.` In the edit flow, clearing the pending file must leave the existing saved-image preview unchanged. No upload request will be made with the rejected file.

Each upload flow will also validate its current file immediately before submission as defense in depth. In the edit and manual-add flows, a failed pre-submit check clears the pending file, shows the same error toast, and aborts submission. In the batch flow, any failed pre-submit check clears every invalid pending image, shows one error toast, and aborts the entire batch without making requests; the selected items and valid pending images remain available for correction and resubmission. This protects against stale or programmatically supplied state without replacing the backend's authoritative validation.

Every image input will display `Maximum file size: 2 MB` in its help text. The UI uses the familiar `MB` label, while the enforced boundary matches PHP's `2M` value at 2 MiB (2,097,152 bytes). Existing accepted image formats and unrelated form behavior remain unchanged.

## API Error Handling

Upload request failures will prefer a useful message supplied by the API. The extractor will support the response shapes produced by this Yii backend:

- a string response body;
- an HTTP exception object with `response.data.message`; and
- a validation-error array containing `{ field, message }` objects, whose non-empty messages will be deduplicated and joined in response order.

Empty or non-string values will be ignored. When the response contains no useful message, each flow will retain an operation-specific fallback such as `Failed to update item.`

For batch uploads, each rejected result will retain the extracted error message. If all failures share one message, the toast will show that message once followed by the existing failed-item title summary. If failures have different messages, the summary will list up to three failed item titles paired with their messages and retain the existing `and N more` truncation. Partial success uses the same failure summary after the existing success count. One aggregate toast will be shown per batch rather than one toast per failed request.

## Testing

Focused unit tests will cover:

- a file exactly 2 MiB being accepted;
- a file one byte above 2 MiB being rejected with the expected message;
- missing files being accepted as optional;
- extraction of string, HTTP-exception, and validation-array API responses;
- fallback behavior when the API supplies no useful message;
- batch failures that all share one message;
- batch failures with different messages; and
- partial batch success with server error context.

The existing test command, lint command, and production build will be run after implementation. Manual verification will confirm that selecting an oversized image clears the pending file, displays the toast, and preserves the existing saved-image preview in the edit flow. It will also confirm that defensive pre-submit rejection aborts a single-item request or the entire batch as specified above, without uploading the rejected file.

## Non-Goals

- Raising or changing PHP or backend upload limits.
- Client-side image compression or resizing.
- Changing supported image formats.
- Refactoring unrelated admin request handling.
