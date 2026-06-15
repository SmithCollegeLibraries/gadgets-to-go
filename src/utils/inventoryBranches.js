export function getItemBranchCodes(item) {
  if (!item) return [];

  const fromArray = Array.isArray(item.branches)
    ? item.branches.filter((b) => typeof b === 'string' && b.trim().length > 0)
    : [];

  if (fromArray.length > 0) return fromArray;

  if (typeof item.branch === 'string' && item.branch.trim().length > 0) return [item.branch.trim()];

  return [];
}

export function getPrimaryBranchCode(item) {
  return getItemBranchCodes(item)[0] || '';
}

export function normalizeInventoryItemBranches(item) {
  const branchCodes = getItemBranchCodes(item);

  return {
    ...item,
    branches: branchCodes,
    branch: typeof item?.branch === 'string' && item.branch.trim().length > 0 ? item.branch.trim() : branchCodes[0] || '',
  };
}
