import { useState, useEffect, useRef } from 'react';
import { Input, ListGroup, ListGroupItem } from 'reactstrap';
import PropTypes from 'prop-types';

const SearchableSelect = ({ options, value, onChange, disabled, placeholder, idField = 'id', labelField = 'name', codeField = 'code' }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Initialize display text if value exists
    useEffect(() => {
        if (value) {
            const selected = options.find(opt => opt[idField] === value);
            if (selected) setSearchTerm(selected[labelField]);
        } else {
            setSearchTerm('');
        }
    }, [value, options, idField, labelField]);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                const selected = options.find(opt => opt[idField] === value);
                setSearchTerm(selected ? selected[labelField] : '');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, options, idField, labelField]);

    const filteredOptions = options.filter(opt =>
        opt[labelField].toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt[codeField] && opt[codeField].toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleSelect = (opt) => {
        onChange(opt[idField]);
        setSearchTerm(opt[labelField]);
        setIsOpen(false);
    };

    const handleInputChange = (e) => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
        if (e.target.value === '') {
            onChange('');
        }
    }

    return (
        <div ref={containerRef} className="position-relative">
            <Input
                type="text"
                placeholder={placeholder || "Search..."}
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={() => setIsOpen(true)}
                disabled={disabled}
                autoComplete="off"
            />
            {isOpen && !disabled && (
                <div className="position-absolute w-100 bg-white border rounded shadow-sm" style={{ zIndex: 2000, maxHeight: '200px', overflowY: 'auto' }}>
                    <ListGroup flush>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <ListGroupItem
                                    key={opt[idField]}
                                    action
                                    onClick={() => handleSelect(opt)}
                                    className="d-flex justify-content-between align-items-center small py-2"
                                >
                                    <span>{opt[labelField]}</span>
                                    {opt[codeField] && <small className="text-muted ms-2 bg-light px-1 rounded">{opt[codeField]}</small>}
                                </ListGroupItem>
                            ))
                        ) : (
                            <ListGroupItem className="text-muted small text-center">No results found</ListGroupItem>
                        )}
                    </ListGroup>
                </div>
            )}
        </div>
    );
};

SearchableSelect.propTypes = {
    options: PropTypes.array.isRequired,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    placeholder: PropTypes.string,
    idField: PropTypes.string,
    labelField: PropTypes.string,
    codeField: PropTypes.string,
};

export default SearchableSelect;
