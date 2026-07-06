import { useState } from 'react';
import {
    Modal, ModalHeader, ModalBody, ModalFooter,
    Row, Col, Label, Input, Button, Table
} from 'reactstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import SearchableSelect from '../../Common/SearchableSelect';
import MultiSelectFilter from '../../Common/MultiSelectFilter';
import { locations } from '../../../data/locations';
import { buildFolioInventorySearchUrl, getLocationUuid } from '../../../utils/folioSearch';

// ReactQuill toolbar configuration
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link'],
    ['clean']
  ],
};

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'link'
];

const ownerLocationPrefixes = {
    AMH: 'AC',
    HMC: 'HC',
    MHC: 'MH',
    SMC: 'SC',
    UMA: 'UM',
};

const AddItemModal = ({ isOpen, toggle, baseUrl, token, mapLocations, refreshInventory, filteredBranches, filterGroups = [] }) => {
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('title');
    const [location, setLocation] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedItemsData, setSelectedItemsData] = useState({});
    const [isSearching, setIsSearching] = useState(false);
    const [batchBranch, setBatchBranch] = useState('');
    const [batchFilterOptionIds, setBatchFilterOptionIds] = useState([]);
    const ownerLocationPrefix = ownerLocationPrefixes[mapLocations] || '';
    const folioLocations = locations
        .filter((item) => !ownerLocationPrefix || item.name.startsWith(`${ownerLocationPrefix} `) || item.name.startsWith(ownerLocationPrefix))
        .map((item) => ({
            ...item,
            folioLocationId: getLocationUuid(item),
        }))
        .filter((item) => item.folioLocationId);

    const handleSearch = async () => {
        if (!searchQuery && searchType !== 'location') return;
        if (searchType === 'location' && !location) {
            toast.warning('Please select a FOLIO location before searching.');
            return;
        }

        setIsSearching(true);

        try {
            const queryUrl = buildFolioInventorySearchUrl(searchType, {
                searchQuery,
                locationId: location,
            });
            const response = await axios.get(queryUrl);
            setSearchResults(response.data.data.instances || []);
        } catch (error) {
            console.error(error);
            toast.error(searchType === 'location'
                ? 'Location search requires FOLIO location UUIDs. Update locations.js with UUID values before using this search.'
                : 'Failed to search inventory.');
        } finally {
            setIsSearching(false);
        }
    };

    const buildUploadForm = (data) => {
        const { item, description, image } = data;
        const form = new FormData();
        form.append('title', item.title);
        form.append('folio_id', item.id);
        form.append('description', description || '');
        form.append('owner', mapLocations);
        if (batchBranch) {
            form.append('branches[]', batchBranch);
        }
        batchFilterOptionIds.forEach(id => form.append('filter_option_ids[]', id));
        form.append('sort_order', 9999);

        if (image) form.append('image', image);

        return form;
    };

    const summarizeFailures = (failures) => {
        const names = failures.map(({ item }) => item.title).slice(0, 3).join(', ');
        return failures.length > 3 ? `${names}, and ${failures.length - 3} more` : names;
    };

    const handleBatchUpload = async () => {
        const itemsToUpload = Object.values(selectedItemsData).filter(d => d.selected);

        if (itemsToUpload.length === 0) {
            toast.warning("Please select at least one item to add.");
            return;
        }

        const results = await Promise.all(itemsToUpload.map(async (data) => {
            try {
                await axios.post(`${baseUrl}/inventory/create`, buildUploadForm(data), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                return { status: 'fulfilled', item: data.item };
            } catch (error) {
                console.error('Failed to add item:', data.item?.title, error);
                return { status: 'rejected', item: data.item };
            }
        }));

        const successes = results.filter(result => result.status === 'fulfilled');
        const failures = results.filter(result => result.status === 'rejected');

        if (successes.length > 0) {
            refreshInventory();
        }

        if (failures.length > 0) {
            const failedIds = new Set(failures.map(({ item }) => String(item.id)));
            setSelectedItemsData(previous => Object.fromEntries(
                Object.entries(previous).filter(([itemId]) => failedIds.has(itemId))
            ));

            if (successes.length > 0) {
                toast.warning(`Added ${successes.length} item${successes.length === 1 ? '' : 's'}; ${failures.length} failed: ${summarizeFailures(failures)}.`);
            } else {
                toast.error(`No items were added. Failed: ${summarizeFailures(failures)}.`);
            }
            return;
        }

        toast.success(`Added ${successes.length} item${successes.length === 1 ? '' : 's'} successfully.`);

        // Reset State
        setSearchQuery('');
        setSearchResults([]);
        setSelectedItemsData({});
        setBatchBranch('');
        setBatchFilterOptionIds([]);
        toggle();
    };

    const clearSearch = () => {
        setSearchQuery('');
        setLocation('');
        setSearchResults([]);
        setSelectedItemsData({});
        setBatchFilterOptionIds([]);
    };

    const handleFilterGroupChange = (group, selectedOptionIds) => {
        const groupOptionIds = new Set(group.options.map(option => Number(option.id)));
        setBatchFilterOptionIds(previous => {
            const otherGroupIds = previous.filter(id => !groupOptionIds.has(Number(id)));
            return [...otherGroupIds, ...selectedOptionIds.map(Number)];
        });
    };

    return (
        <Modal isOpen={isOpen} toggle={toggle} size="xl" scrollable className="add-item-modal">
            <ModalHeader toggle={toggle} className="bg-light border-bottom-0">
                <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-plus-circle-fill text-primary"></i>
                    <span className="fw-bold text-primary">Add Equipment from FOLIO</span>
                </div>
            </ModalHeader>
            <ModalBody className="p-4">
                <div className="bg-light p-4 rounded-3 mb-4 shadow-sm border">
                    <Row className="g-3 align-items-end">
                        <Col md={5}>
                            <Label size="sm" for="search" className="fw-bold text-secondary text-uppercase small">Keywords</Label>
                            <Input
                                id="search"
                                placeholder={searchType === 'location' ? 'Disabled for location search' : "Enter title or HRID..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={searchType === 'location'}
                                className="form-control-lg"
                            />
                        </Col>
                        <Col md={2}>
                            <Label size="sm" for="type" className="fw-bold text-secondary text-uppercase small">Search By</Label>
                            <Input type="select" id="type" value={searchType} onChange={(e) => setSearchType(e.target.value)} className="form-select-lg">
                                <option value="title">Title</option>
                                <option value="hrid">HRID</option>
                                <option value="location">Location</option>
                            </Input>
                        </Col>
                        <Col md={5}>
                            {searchType === 'location' && (
                                <div style={{ marginBottom: '0px' }}>
                                    <Label size="sm" className="fw-bold text-secondary text-uppercase small">Select Location</Label>
                                    <SearchableSelect
                                        options={folioLocations}
                                        value={location}
                                        onChange={(val) => setLocation(val)}
                                        placeholder={folioLocations.length > 0 ? 'Type to search location...' : 'No UUID-backed locations configured'}
                                        idField="folioLocationId"
                                        codeField="code"
                                        disabled={folioLocations.length === 0}
                                        className="form-control-lg"
                                    />
                                    {folioLocations.length === 0 && (
                                        <div className="small text-danger mt-1">
                                            Location search needs FOLIO location UUIDs in locations.js.
                                        </div>
                                    )}
                                </div>
                            )}
                            {searchType !== 'location' && (
                                <div className="d-flex align-items-end h-100 pb-1">
                                    <div className="text-muted small fst-italic"><i className="bi bi-info-circle me-1"></i> Enter a term to search the library catalog.</div>
                                </div>
                            )}
                        </Col>
                    </Row>
                    <div className="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
                        <Button color="secondary" outline onClick={clearSearch}>
                            <i className="bi bi-eraser me-1"></i> Clear
                        </Button>
                        <Button color="primary" onClick={handleSearch} disabled={isSearching} className="px-4">
                            {isSearching ? <><span className="spinner-border spinner-border-sm me-2" />Searching...</> : <><i className="bi bi-search me-2"></i>Search Catalog</>}
                        </Button>
                    </div>
                </div>

                {/* Results Section */}
                {searchResults.length > 0 && (
                    <div className="results-section animate__animated animate__fadeIn">
                        <div className="mb-4 p-3 bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded d-flex align-items-center justify-content-between">
                            <div>
                                <Label className="fw-bold mb-0 text-primary">
                                    <i className="bi bi-shop me-2"></i>
                                    Assign Branch to Selected Items
                                </Label>
                                <div className="small text-muted">All selected items will be assigned to this branch location.</div>
                            </div>
                            <div style={{ minWidth: '300px' }}>
                                <SearchableSelect
                                    options={filteredBranches}
                                    value={batchBranch}
                                    onChange={setBatchBranch}
                                    placeholder="Select branch..."
                                    idField="code"
                                />
                            </div>
                        </div>

                        {filterGroups.length > 0 && (
                            <div className="mb-4 p-3 bg-light border rounded">
                                <Label className="fw-bold mb-3 text-secondary">
                                    <i className="bi bi-tags me-2"></i>
                                    Assign Filters to Selected Items
                                </Label>
                                <Row className="g-3">
                                    {filterGroups.map(group => (
                                        <Col md={6} lg={4} key={group.id}>
                                            <MultiSelectFilter
                                                label={group.name}
                                                options={group.options}
                                                idField="id"
                                                selectedValues={batchFilterOptionIds.filter(id => (
                                                    group.options.some(option => Number(option.id) === Number(id))
                                                ))}
                                                onChange={(selectedIds) => handleFilterGroupChange(group, selectedIds)}
                                                placeholder={`Select ${group.name}`}
                                            />
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                        )}

                        <div className="table-responsive border rounded shadow-sm">
                            <Table hover className="mb-0 align-middle">
                                <thead className="bg-light sticky-top">
                                    <tr>
                                        <th style={{ width: '50px' }} className="text-center"><i className="bi bi-check-square"></i></th>
                                        <th style={{ width: '30%' }}>Details</th>
                                        <th>Description</th>
                                        <th style={{ width: '150px' }}>Image</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {searchResults.map(item => (
                                        <tr key={item.id} className={selectedItemsData[item.id]?.selected ? 'table-active bg-primary bg-opacity-10' : ''}>
                                            <td className="text-center">
                                                <Input
                                                    type="checkbox"
                                                    className="form-check-input fs-5"
                                                    checked={!!selectedItemsData[item.id]?.selected}
                                                    onChange={() => {
                                                        setSelectedItemsData(p => ({ ...p, [item.id]: { ...p[item.id], item, selected: !p[item.id]?.selected } }));
                                                    }}
                                                />
                                            </td>
                                            <td>
                                                <div className="fw-bold text-dark">{item.title}</div>
                                                <div className="small text-muted font-monospace bg-light d-inline-block px-1 rounded mt-1">{item.hrid}</div>
                                            </td>
                                            <td>
                                                <ReactQuill
                                                    theme="snow"
                                                    value={selectedItemsData[item.id]?.description || ''}
                                                    onChange={(value) => {
                                                        setSelectedItemsData(p => ({ ...p, [item.id]: { ...p[item.id], description: value } }));
                                                    }}
                                                    modules={quillModules}
                                                    formats={quillFormats}
                                                    placeholder="Add a custom description with formatting..."
                                                    style={{ backgroundColor: 'white', minHeight: '100px' }}
                                                />
                                            </td>
                                            <td>
                                                <Input
                                                    type="file"
                                                    size="sm"
                                                    className="form-control-sm"
                                                    onChange={(e) => {
                                                        setSelectedItemsData(p => ({ ...p, [item.id]: { ...p[item.id], image: e.target.files[0] } }));
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </div>
                )}
            </ModalBody>
            <ModalFooter className="bg-light border-top-0">
                <Button color="light" onClick={toggle} className="border">Cancel</Button>
                <Button color="success" onClick={handleBatchUpload} disabled={Object.values(selectedItemsData).filter(d => d.selected).length === 0} className="px-4">
                    <i className="bi bi-plus-lg me-2"></i>
                    Add {Object.values(selectedItemsData).filter(d => d.selected).length > 0 ? Object.values(selectedItemsData).filter(d => d.selected).length : ''} Items
                </Button>
            </ModalFooter>
        </Modal>
    );
};

AddItemModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    toggle: PropTypes.func.isRequired,
    baseUrl: PropTypes.string.isRequired,
    token: PropTypes.string.isRequired,
    mapLocations: PropTypes.string,
    refreshInventory: PropTypes.func.isRequired,
    filteredBranches: PropTypes.array.isRequired,
    filterGroups: PropTypes.array,
};

export default AddItemModal;
