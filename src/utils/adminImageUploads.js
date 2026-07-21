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
