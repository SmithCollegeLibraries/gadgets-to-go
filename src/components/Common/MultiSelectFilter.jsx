import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Input, ListGroup, ListGroupItem } from 'reactstrap';
import PropTypes from 'prop-types';

function MultiSelectFilter({
  label,
  options,
  selectedValues,
  onChange,
  idField = 'slug',
  labelField = 'name',
  placeholder = 'Select options',
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

  const selectedSet = new Set(selectedValues);
  const selectedOptions = options.filter((option) => selectedSet.has(option[idField]));
  const filteredOptions = options.filter((option) => (
    option[labelField].toLowerCase().includes(searchTerm.toLowerCase())
  ));

  const toggleValue = (value) => {
    if (selectedSet.has(value)) {
      onChange(selectedValues.filter((selected) => selected !== value));
      return;
    }

    onChange([...selectedValues, value]);
  };

  const buttonLabel = selectedOptions.length > 0
    ? `${label}: ${selectedOptions.length}`
    : placeholder;

  return (
    <div ref={containerRef} className="multi-select-filter position-relative">
      {label && <div className="small fw-bold text-secondary mb-1">{label}</div>}
      <Button
        type="button"
        color={selectedOptions.length > 0 ? 'primary' : 'light'}
        outline={selectedOptions.length === 0}
        className="w-100 d-flex justify-content-between align-items-center text-start"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <span className="text-truncate">{buttonLabel}</span>
        <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true"></i>
      </Button>

      {selectedOptions.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mt-2">
          {selectedOptions.map((option) => (
            <Badge
              key={option[idField]}
              color="light"
              className="text-dark border d-inline-flex align-items-center gap-1"
              pill
            >
              {option[labelField]}
              <button
                type="button"
                className="btn-close btn-close-sm"
                aria-label={`Remove ${option[labelField]}`}
                onClick={() => toggleValue(option[idField])}
              />
            </Badge>
          ))}
        </div>
      )}

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
          <ListGroup flush style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <ListGroupItem
                  key={option[idField]}
                  action
                  className="d-flex align-items-center gap-2 small"
                  onClick={() => toggleValue(option[idField])}
                >
                  <Input
                    type="checkbox"
                    checked={selectedSet.has(option[idField])}
                    readOnly
                    aria-label={option[labelField]}
                  />
                  <span>{option[labelField]}</span>
                </ListGroupItem>
              ))
            ) : (
              <ListGroupItem className="text-muted small text-center">No matching options</ListGroupItem>
            )}
          </ListGroup>
        </div>
      )}
    </div>
  );
}

MultiSelectFilter.propTypes = {
  label: PropTypes.string,
  options: PropTypes.array.isRequired,
  selectedValues: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  idField: PropTypes.string,
  labelField: PropTypes.string,
  placeholder: PropTypes.string,
};

export default MultiSelectFilter;
