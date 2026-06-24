export function getSelectedCount(groups = [], selectedByGroup = {}) {
  return groups.reduce((total, group) => (
    total + (selectedByGroup[group.slug] || []).length
  ), 0);
}

export function getMatchingOptions(groups = [], searchTerm = '') {
  const term = String(searchTerm || '').toLowerCase();

  return groups.flatMap((group) => (
    group.options
      .filter((option) => option.name.toLowerCase().includes(term))
      .map((option) => ({ groupSlug: group.slug, option }))
  ));
}
