import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Input, ListGroup, ListGroupItem } from 'reactstrap';
import PropTypes from 'prop-types';

function CombinedFilterDropdown({
  groups,
  selectedByGroup,
  onToggle,
  placeholder = 'All Filters',
  ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isOptionSelected = (groupSlug, optionSlug) => (
    (selectedByGroup[groupSlug] || []).includes(optionSlug)
  );

  const selectedCount = groups.reduce((total, group) => (
    total + (selectedByGroup[group.slug] || []).length
  ), 0);

  const term = searchTerm.toLowerCase();
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      options: group.options.filter((option) => option.name.toLowerCase().includes(term)),
    }))
    .filter((group) => group.options.length > 0);

  const showHeaders = groups.length > 1;
  const hasSelection = selectedCount > 0;

  return (
    <div ref={containerRef} className="multi-select-filter position-relative">
      <Button
        type="button"
        color="secondary"
        outline
        className="w-100 d-flex justify-content-between align-items-center text-start text-dark bg-white border"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
      >
        <span className="text-truncate">{placeholder}</span>
        <span className="d-flex align-items-center gap-2 flex-shrink-0">
          {hasSelection && <Badge color="primary" pill>{selectedCount}</Badge>}
          <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true"></i>
        </span>
      </Button>

      {isOpen && (
        <div className="position-absolute w-100 bg-white border rounded shadow-sm mt-1" style={{ zIndex: 2000 }}>
          <div className="p-2 border-bottom">
            <Input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search options..."
              bsSize="sm"
              autoFocus
            />
          </div>
          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {visibleGroups.length > 0 ? (
              visibleGroups.map((group) => (
                <div key={group.slug}>
                  {showHeaders && (
                    <div className="px-3 pt-2 pb-1 small fw-bold text-secondary text-uppercase">
                      {group.name}
                    </div>
                  )}
                  <ListGroup flush>
                    {group.options.map((option) => (
                      <ListGroupItem
                        key={`${group.slug}:${option.slug}`}
                        action
                        className="d-flex align-items-center gap-2 small"
                        onClick={() => onToggle(group.slug, option.slug)}
                      >
                        <Input
                          type="checkbox"
                          checked={isOptionSelected(group.slug, option.slug)}
                          readOnly
                          aria-label={option.name}
                        />
                        <span>{option.name}</span>
                      </ListGroupItem>
                    ))}
                  </ListGroup>
                </div>
              ))
            ) : (
              <div className="text-muted small text-center py-2">No matching options</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

CombinedFilterDropdown.propTypes = {
  groups: PropTypes.array.isRequired,
  selectedByGroup: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  ariaLabel: PropTypes.string,
};

export default CombinedFilterDropdown;
