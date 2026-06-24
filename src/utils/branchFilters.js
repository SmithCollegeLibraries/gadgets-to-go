export const BRANCH_QUERY_KEY = 'branch';

export function getSelectedBranchesFromQuery(params, allowedCodes = null) {
  const raw = params.get(BRANCH_QUERY_KEY);
  if (!raw) return [];

  const allowed = allowedCodes ? new Set(allowedCodes) : null;
  const codes = raw
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean)
    .filter((code) => (allowed ? allowed.has(code) : true));

  return [...new Set(codes)];
}

export function buildBranchQueryParams(existingParams, selectedBranches = []) {
  const params = new URLSearchParams(existingParams);

  const clean = Array.isArray(selectedBranches)
    ? [...new Set(selectedBranches.map((code) => String(code).trim()).filter(Boolean))]
    : [];

  if (clean.length > 0) {
    params.set(BRANCH_QUERY_KEY, clean.join(','));
  } else {
    params.delete(BRANCH_QUERY_KEY);
  }

  return params;
}

export function doesItemMatchSelectedBranches(item, selectedBranches = []) {
  if (!Array.isArray(selectedBranches) || selectedBranches.length === 0) return true;

  const itemBranches = Array.isArray(item?.branches)
    ? item.branches
    : (item?.branch ? [item.branch] : []);

  return itemBranches.some((code) => selectedBranches.includes(code));
}
