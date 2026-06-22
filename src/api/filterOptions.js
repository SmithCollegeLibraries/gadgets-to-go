import axios from 'axios';
import { normalizeFilterGroups } from '../utils/customFilters';

export async function fetchFilterGroups(baseUrl, owner, token, options = {}) {
  if (!baseUrl || !owner) return [];

  const response = await axios.get(`${baseUrl}/filter-options`, {
    params: { owner, include_inactive: options.includeInactive ? 1 : undefined },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const groups = response.data?.groups || response.data || [];
  return options.includeInactive ? groups : normalizeFilterGroups(groups);
}

export async function saveFilterGroups(baseUrl, owner, groups, token, options = {}) {
  const response = await axios.post(
    `${baseUrl}/filter-options`,
    { owner, groups },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const savedGroups = response.data?.groups || response.data || groups;
  return options.includeInactive ? savedGroups : normalizeFilterGroups(savedGroups);
}
