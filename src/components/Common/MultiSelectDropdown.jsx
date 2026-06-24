import { useEffect, useId, useRef, useState } from 'react';
import { Badge, Input, ListGroup, ListGroupItem } from 'reactstrap';
import PropTypes from 'prop-types';
import { getMatchingGroups, getSelectedCount } from '../../utils/multiSelectDropdown';

function MultiSelectDropdown({
  groups,
  selectedByGroup,
  onToggle,
  placeholder = 'All Filters',
  ariaLabel,
  searchThreshold = 8,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();

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

  const closeAndFocusTrigger = () => {
    setIsOpen(false);
    setSearchTerm('');
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && isOpen) {
      event.stopPropagation();
      closeAndFocusTrigger();
    }
  };

  const isOptionSelected = (groupSlug, optionSlug) => (
    (selectedByGroup[groupSlug] || []).includes(optionSlug)
  );

  const selectedCount = getSelectedCount(groups, selectedByGroup);
  const matchingGroups = getMatchingGroups(groups, searchTerm);
  const totalOptions = groups.reduce((total, group) => total + group.options.length, 0);
  const showSearch = totalOptions > searchThreshold;
  const showGroupHeaders = groups.length > 1;
  const hasSelection = selectedCount > 0;
  const triggerLabel = ariaLabel || placeholder;
  const accessibleLabel = hasSelection
    ? `${triggerLabel}, ${selectedCount} selected`
    : triggerLabel;

  return (
    <div
      ref={containerRef}
      className="multi-select-filter position-relative"
      onKeyDown={handleKeyDown}
    >
      <button
        ref={buttonRef}
        type="button"
        className="form-select text-start"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls={panelId}
        aria-label={accessibleLabel}
      >
        <span className="text-truncate">{placeholder}</span>
        {hasSelection && <Badge color="primary" pill className="ms-2 align-middle">{selectedCount}</Badge>}
      </button>

      {isOpen && (
        <div
          id={panelId}
          className="position-absolute w-100 bg-white border rounded shadow-sm mt-1"
          style={{ zIndex: 2000 }}
        >
          {showSearch && (
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
          )}
          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {matchingGroups.length > 0 ? (
              matchingGroups.map((group) => (
                <div key={group.slug} role="group" aria-label={group.name}>
                  {showGroupHeaders && (
                    <div className="px-3 pt-2 pb-1 text-uppercase small fw-semibold text-muted bg-light border-bottom">
                      {group.name}
                    </div>
                  )}
                  <ListGroup flush tag="div">
                    {group.options.map((option) => (
                      <ListGroupItem
                        key={`${group.slug}:${option.slug}`}
                        tag="label"
                        action
                        className="d-flex align-items-center gap-2 small mb-0"
                      >
                        <Input
                          type="checkbox"
                          className="mt-0"
                          checked={isOptionSelected(group.slug, option.slug)}
                          onChange={() => onToggle(group.slug, option.slug)}
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

MultiSelectDropdown.propTypes = {
  groups: PropTypes.array.isRequired,
  selectedByGroup: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  ariaLabel: PropTypes.string,
  searchThreshold: PropTypes.number,
};

export default MultiSelectDropdown;
