const FOLIO_SEARCH_URL = 'https://libtools2.smith.edu/folio/web/search/search-inventory?query=';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidLike(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function getLocationUuid(location) {
  const candidates = [
    location?.folioLocationId,
    location?.folio_location_id,
    location?.locationId,
    location?.id,
  ];

  return candidates.find(isUuidLike) || '';
}

export function buildFolioInventorySearchUrl(searchType, { searchQuery = '', locationId = '' } = {}) {
  if (searchType === 'title') return `${FOLIO_SEARCH_URL}(title all "${searchQuery}")`;
  if (searchType === 'hrid') return `${FOLIO_SEARCH_URL}hrid=${searchQuery}`;

  if (searchType === 'location') {
    if (!isUuidLike(locationId)) {
      throw new Error('A FOLIO location UUID is required for location search.');
    }
    return `${FOLIO_SEARCH_URL}(items.effectiveLocationId=="${locationId}")`;
  }

  return FOLIO_SEARCH_URL;
}
