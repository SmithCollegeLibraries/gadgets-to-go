import { useEffect, useRef, useState } from 'react';
import { Badge, Input, ListGroup, ListGroupItem } from 'reactstrap';
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
  const matchingOptions = groups.flatMap((group) => (
    group.options
      .filter((option) => option.name.toLowerCase().includes(term))
      .map((option) => ({ groupSlug: group.slug, option }))
  ));

  const hasSelection = selectedCount > 0;

  return (
    <div ref={containerRef} className="multi-select-filter position-relative">
      <button
        type="button"
        className="form-select text-start"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
      >
        <span className="text-truncate">{placeholder}</span>
        {hasSelection && <Badge color="primary" pill className="ms-2 align-middle">{selectedCount}</Badge>}
      </button>

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
            {matchingOptions.length > 0 ? (
              <ListGroup flush>
                {matchingOptions.map(({ groupSlug, option }) => (
                  <ListGroupItem
                    key={`${groupSlug}:${option.slug}`}
                    action
                    className="d-flex align-items-center gap-2 small"
                    onClick={() => onToggle(groupSlug, option.slug)}
                  >
                    <Input
                      type="checkbox"
                      checked={isOptionSelected(groupSlug, option.slug)}
                      readOnly
                      aria-label={option.name}
                    />
                    <span>{option.name}</span>
                  </ListGroupItem>
                ))}
              </ListGroup>
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
