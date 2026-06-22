export const CUSTOM_FILTER_QUERY_PREFIX = 'filter.';

export function slugifyFilterValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function compareSortOrder(a, b) {
  const aOrder = Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : 9999;
  const bOrder = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 9999;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return String(a.name || '').localeCompare(String(b.name || ''));
}

export function normalizeFilterGroups(groups = []) {
  if (!Array.isArray(groups)) return [];

  return groups
    .filter((group) => group && group.is_active !== false)
    .map((group) => ({
      ...group,
      slug: group.slug || slugifyFilterValue(group.name),
      options: Array.isArray(group.options)
        ? group.options
            .filter((option) => option && option.is_active !== false)
            .map((option) => ({
              ...option,
              slug: option.slug || slugifyFilterValue(option.name),
            }))
            .sort(compareSortOrder)
        : [],
    }))
    .filter((group) => group.slug && group.options.length > 0)
    .sort(compareSortOrder);
}

export function getSelectedCustomFiltersFromQuery(params, groups = []) {
  const selected = {};
  const normalizedGroups = normalizeFilterGroups(groups);

  normalizedGroups.forEach((group) => {
    const value = params.get(`${CUSTOM_FILTER_QUERY_PREFIX}${group.slug}`);
    if (!value) return;

    const allowed = new Set(group.options.map((option) => option.slug));
    const selectedSlugs = value
      .split(',')
      .map((slug) => slug.trim())
      .filter((slug) => allowed.has(slug));

    if (selectedSlugs.length > 0) {
      selected[group.slug] = [...new Set(selectedSlugs)];
    }
  });

  return selected;
}

export function buildCustomFilterQueryParams(existingParams, selectedFilters = {}) {
  const params = new URLSearchParams(existingParams);

  Array.from(params.keys()).forEach((key) => {
    if (key.startsWith(CUSTOM_FILTER_QUERY_PREFIX)) params.delete(key);
  });

  Object.entries(selectedFilters).forEach(([groupSlug, optionSlugs]) => {
    const cleanSlugs = Array.isArray(optionSlugs)
      ? optionSlugs.map((slug) => String(slug).trim()).filter(Boolean)
      : [];

    if (cleanSlugs.length > 0) {
      params.set(`${CUSTOM_FILTER_QUERY_PREFIX}${groupSlug}`, [...new Set(cleanSlugs)].join(','));
    }
  });

  return params;
}

function getItemFilterOptionIds(item) {
  if (Array.isArray(item?.filter_option_ids)) return item.filter_option_ids.map(Number);
  if (Array.isArray(item?.custom_filter_option_ids)) return item.custom_filter_option_ids.map(Number);
  if (Array.isArray(item?.custom_filters)) return item.custom_filters.map((filter) => Number(filter.id));
  if (Array.isArray(item?.filterOptions)) return item.filterOptions.map((filter) => Number(filter.id));
  return [];
}

export function doesItemMatchSelectedFilters(item, selectedFilters = {}, groups = []) {
  const activeSelections = Object.entries(selectedFilters).filter(([, optionSlugs]) => (
    Array.isArray(optionSlugs) && optionSlugs.length > 0
  ));

  if (activeSelections.length === 0) return true;

  const normalizedGroups = normalizeFilterGroups(groups);
  const groupBySlug = new Map(normalizedGroups.map((group) => [group.slug, group]));
  const itemOptionIds = new Set(getItemFilterOptionIds(item));

  return activeSelections.every(([groupSlug, selectedOptionSlugs]) => {
    const group = groupBySlug.get(groupSlug);
    if (!group) return true;

    const selectedOptionIds = group.options
      .filter((option) => selectedOptionSlugs.includes(option.slug))
      .map((option) => Number(option.id));

    return selectedOptionIds.some((id) => itemOptionIds.has(id));
  });
}

export function getSelectedFilterOptionIds(selectedFilters = {}, groups = []) {
  const normalizedGroups = normalizeFilterGroups(groups);
  const ids = [];

  normalizedGroups.forEach((group) => {
    const selectedSlugs = selectedFilters[group.slug] || [];
    group.options.forEach((option) => {
      if (selectedSlugs.includes(option.slug)) ids.push(Number(option.id));
    });
  });

  return ids;
}
