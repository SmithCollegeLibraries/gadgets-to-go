export function getSelectedCount(groups = [], selectedByGroup = {}) {
  return groups.reduce((total, group) => (
    total + (selectedByGroup[group.slug] || []).length
  ), 0);
}

export function getMatchingGroups(groups = [], searchTerm = '') {
  const term = String(searchTerm || '').toLowerCase();

  return groups
    .map((group) => ({
      ...group,
      options: group.options.filter((option) => option.name.toLowerCase().includes(term)),
    }))
    .filter((group) => group.options.length > 0);
}
