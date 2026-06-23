// SchoolPage.jsx

import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Container, Row, Col, Card, CardBody, CardTitle, CardText,
  Input, InputGroup, InputGroupText, Badge, Button, Table
} from 'reactstrap';
import { ArrowUp } from 'lucide-react';
import useSchoolStore from '../store/schoolStore';
import ItemModal from '../components/ItemModal.jsx';
import LoginButton from '../components/StaffLogin.jsx';
import CombinedFilterDropdown from '../components/Common/CombinedFilterDropdown.jsx';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import PropTypes from 'prop-types';
import { branches } from '../data/branches';
import useFetchCustomFilters from '../hooks/useFetchCustomFilters';
import {
  buildCustomFilterQueryParams,
  doesItemMatchSelectedFilters,
  getSelectedCustomFiltersFromQuery,
} from '../utils/customFilters';

// Helper to map school param to Branch Prefix
const getBranchPrefix = (schoolParam) => {
  const map = {
    'smith': 'SC',
    'mtholyoke': 'MH',
    'amherst': 'AC',
    'hampshire': 'HC',
    'umass': 'UM'
  };
  return map[schoolParam] || '';
};

const getLocationName = (code) => {
  const map = {
    'SMC': 'Smith College',
    'MHC': 'Mount Holyoke College',
    'AMH': 'Amherst College',
    'HMC': 'Hampshire College',
    'UMA': 'UMass Amherst'
  };
  return map[code] || code;
};

const getOwnerCode = (schoolParam) => {
  const map = {
    'smith': 'SMC',
    'mtholyoke': 'MHC',
    'amherst': 'AMH',
    'hampshire': 'HMC',
    'umass': 'UMA'
  };
  return map[schoolParam] || '';
};

const formatBranchName = (code) => {
  const branch = branches.find(b => b.code === code);
  if (!branch) return code;
  // Remove 2-letter prefix followed by space (e.g. "SC ", "MH ", "AC ")
  return branch.name.replace(/^[A-Z]{2}\s+/, '');
};

const getSchoolName = (code) => {
  const mapping = {
    'AMH': 'Amherst College',
    'HMC': 'Hampshire College',
    'MHC': 'Mount Holyoke College',
    'SMC': 'Smith College',
    'UMA': 'University of Massachusetts',
  };
  return mapping[code] || code;
};

const stripHtml = (html) => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

function SchoolPage({ isPreview = false, customStyles = {}, customInventoryData = [] }) {
  const {
    layoutData,
    colorData,
    inventoryData,
    fetchLayoutData,
    fetchInventoryData,
    isLoading,
    isLayoutLoading,
    baseUrl,
  } = useSchoolStore();

  const navigate = useNavigate();
  const location = useLocation();
  const { school } = useParams();

  const [selectedItem, setSelectedItem] = useState(null);
  const [availability, setAvailability] = useState({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [disabledBranches, setDisabledBranches] = useState([]);
  const [logoError, setLogoError] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentSchool, setCurrentSchool] = useState(school);

  // Helper to get params from URL
  const getInitialState = () => {
    const params = new URLSearchParams(location.search);
    return {
      q: params.get('q') || '',
      branch: params.get('branch') || '',
      avail: params.get('avail') === 'true',
      group: params.get('group') === 'true',
      view: params.get('view') || 'grid'
    };
  };

  const initialState = getInitialState();

  // Detect school parameter changes and set transitioning state
  useEffect(() => {
    if (!isPreview && school !== currentSchool) {
      setIsTransitioning(true);
      setCurrentSchool(school);
    }
  }, [school, currentSchool, isPreview]);

  // Clear transitioning state once new data arrives
  useEffect(() => {
    if (!isPreview && isTransitioning && !isLoading && inventoryData.length > 0 && layoutData.length > 0) {
      setIsTransitioning(false);
    }
  }, [isLoading, inventoryData, layoutData, isTransitioning, isPreview]);

  // Filter States (Initialized from URL)
  const [searchQuery, setSearchQuery] = useState(initialState.q);
  const [selectedBranch, setSelectedBranch] = useState(initialState.branch);
  const [showAvailableOnly, setShowAvailableOnly] = useState(initialState.avail);
  const [groupByBranch, setGroupByBranch] = useState(initialState.group);
  const [viewMode, setViewMode] = useState(initialState.view); // 'grid' or 'list'
  const [selectedCustomFilters, setSelectedCustomFilters] = useState({});
  const [filterGroups] = useFetchCustomFilters(baseUrl, getOwnerCode(school), null);

  useEffect(() => {
    if (filterGroups.length === 0) {
      setSelectedCustomFilters({});
      return;
    }

    const params = new URLSearchParams(location.search);
    setSelectedCustomFilters(getSelectedCustomFiltersFromQuery(params, filterGroups));
  }, [filterGroups, location.search]);

  // Sync State to URL
  useEffect(() => {
    if (!isPreview) {
      let params = new URLSearchParams(location.search);

      // Update params based on state
      if (searchQuery) params.set('q', searchQuery); else params.delete('q');
      if (selectedBranch) params.set('branch', selectedBranch); else params.delete('branch');
      if (showAvailableOnly) params.set('avail', 'true'); else params.delete('avail');
      if (groupByBranch) params.set('group', 'true'); else params.delete('group');
      if (viewMode) params.set('view', viewMode); else params.delete('view');
      if (filterGroups.length > 0) {
        params = buildCustomFilterQueryParams(params, selectedCustomFilters);
      }

      // Preserve folio_id (handled by modal logic mostly, but good to keep clean)
      // Note: The modal logic also updates the URL. We use replace to avoid history stack spam.
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [searchQuery, selectedBranch, showAvailableOnly, groupByBranch, viewMode, selectedCustomFilters, filterGroups, isPreview, location.search, navigate]);

  // Determine the effective data based on isPreview
  const effectiveInventoryData = isPreview ? customInventoryData : inventoryData;
  const effectiveColorData = isPreview ? customStyles.colorData : colorData;
  const effectiveLayoutData = isPreview ? customStyles.layoutData : layoutData;
  
  // Show loading if transitioning between schools or if store is loading
  const showLayoutLoading = !isPreview && isLayoutLoading;
  const showLoading = !isPreview && (isLoading || isTransitioning);

  // Data Fetching
  useEffect(() => {
    if (!isPreview) {
      fetchLayoutData(school);
      fetchInventoryData(school);
    }
  }, [fetchLayoutData, fetchInventoryData, school, isPreview]);

  // Fetch disabled branches
  useEffect(() => {
    if (!isPreview) {
      const fetchDisabledBranches = async () => {
        try {
          // Map school param to owner code
          const ownerMap = {
            'smith': 'SMC',
            'mtholyoke': 'MHC',
            'amherst': 'AMH',
            'hampshire': 'HMC',
            'umass': 'UMA'
          };
          const owner = ownerMap[school];
          
          if (owner) {
            const response = await fetch(`${baseUrl}/settings/disabled-items?owner=${owner}`);
            if (response.ok) {
              const data = await response.json();
              setDisabledBranches(data.branches || []);
            }
          }
        } catch (error) {
          // If endpoint doesn't exist or fails, show all branches (default behavior)
          console.log('Could not fetch disabled branches, showing all:', error);
          setDisabledBranches([]);
        }
      };
      
      fetchDisabledBranches();
    }
  }, [school, baseUrl, isPreview]);

  // Scroll to Top Button Logic
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Style Helpers
  const getLayoutItem = (name) => effectiveLayoutData.find((item) => item.name === name)?.text || '';
  const getColorItem = (type) => effectiveColorData.find((item) => item.type === type)?.color_hash || '';

  const headerText = getLayoutItem('headerText');
  const footerText = getLayoutItem('footerText');
  const libraryName = getLayoutItem('libraryName');
  const useLogo = getLayoutItem('useLogo') === 'true';
  const logoUrl = getLayoutItem('logoUrl');
  const logoAlt = getLayoutItem('logoAlt') || libraryName || 'Library Logo';
  const logoHeight = getLayoutItem('logoHeight') || '80';
  const headerTextSize = getLayoutItem('headerTextSize') || '3';

  const theme = {
    bg: showLayoutLoading ? '#f8f9fa' : getColorItem('backgroundColor'),
    headerText: showLayoutLoading ? '#6c757d' : getColorItem('headerTextColor'),
    title: showLayoutLoading ? '#343a40' : getColorItem('titleColor'),
    desc: showLayoutLoading ? '#6c757d' : getColorItem('descriptionColor'),
    footerBg: showLayoutLoading ? '#e9ecef' : getColorItem('footerBackgroundColor'),
    footerText: showLayoutLoading ? '#495057' : getColorItem('footer'),
  };

  // Availability Logic
  const fetchItemAvailability = async (item) => {
    try {
      const response = await fetch(`${baseUrl}/inventory/get-folio?id=${item.folio_id}`);
      const data = await response.json();
      let { holding } = data;
      if (!Array.isArray(holding)) holding = holding ? [holding] : [];

      const availableCount = holding.filter((h) => h.status === 'Available').length;
      setAvailability((prev) => ({
        ...prev,
        [item.folio_id]: { available: availableCount, total: holding.length },
      }));
    } catch (error) { console.error('Error fetching availability:', error); }
  };

  useEffect(() => {
    effectiveInventoryData.forEach((item) => {
      if (!availability[item.folio_id]) fetchItemAvailability(item);
    });
  }, [effectiveInventoryData]);

  // URL Handling for Modal
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const folio_id = params.get('folio_id');
    if (folio_id) {
      const item = effectiveInventoryData.find((item) => item.folio_id === folio_id);
      if (item) setSelectedItem(item);
    }
  }, [location.search, effectiveInventoryData]);

  // Filter Logic
  const filteredBranches = useMemo(() => {
    const prefix = getBranchPrefix(school);
    return branches.filter(b => 
      b.code.startsWith(prefix) && !disabledBranches.includes(b.code)
    );
  }, [school, disabledBranches]);

  const filteredItems = useMemo(() => {
    return effectiveInventoryData.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      // Handle both old single branch and new branches array
      const itemBranches = Array.isArray(item.branches) ? item.branches : (item.branch ? [item.branch] : []);
      const matchesBranch = selectedBranch ? itemBranches.includes(selectedBranch) : true;
      const matchesAvailability = showAvailableOnly ? (availability[item.folio_id]?.available > 0) : true;
      const matchesCustomFilters = doesItemMatchSelectedFilters(item, selectedCustomFilters, filterGroups);
      return matchesSearch && matchesBranch && matchesAvailability && matchesCustomFilters;
    });
  }, [effectiveInventoryData, searchQuery, selectedBranch, showAvailableOnly, availability, selectedCustomFilters, filterGroups]);

  const groupedItems = useMemo(() => {
    if (!groupByBranch) return null;
    const groups = {};
    filteredItems.forEach(item => {
      const branchList = Array.isArray(item.branches) ? item.branches : (item.branch ? [item.branch] : []);
      if (branchList.length === 0) {
        if (!groups['Unassigned']) groups['Unassigned'] = [];
        groups['Unassigned'].push(item);
      } else {
        // Add item to each branch it belongs to
        branchList.forEach(branchCode => {
          if (!groups[branchCode]) groups[branchCode] = [];
          groups[branchCode].push(item);
        });
      }
    });
    return groups;
  }, [groupByBranch, filteredItems]);

  // Flatten selected custom-filter values into removable chips for the shared chip row
  const activeCustomChips = useMemo(() => (
    filterGroups.flatMap((group) => {
      const selected = selectedCustomFilters[group.slug] || [];
      return selected.map((value) => {
        const option = group.options.find((opt) => opt.slug === value);
        return { groupSlug: group.slug, value, label: option ? option.name : value };
      });
    })
  ), [filterGroups, selectedCustomFilters]);

  const removeCustomFilterValue = (groupSlug, value) => {
    setSelectedCustomFilters((previous) => ({
      ...previous,
      [groupSlug]: (previous[groupSlug] || []).filter((selected) => selected !== value),
    }));
  };

  const toggleCustomFilterValue = (groupSlug, optionSlug) => {
    setSelectedCustomFilters((previous) => {
      const current = previous[groupSlug] || [];
      const next = current.includes(optionSlug)
        ? current.filter((value) => value !== optionSlug)
        : [...current, optionSlug];
      return { ...previous, [groupSlug]: next };
    });
  };

  // Handlers
  const toggleModal = () => {
    setSelectedItem(null);
    if (!isPreview) {
      const params = new URLSearchParams(location.search);
      params.delete('folio_id');
      navigate({ search: params.toString() });
    }
  };

  const handleCardClick = (item) => {
    setSelectedItem(item);
    if (!isPreview) {
      const params = new URLSearchParams(location.search);
      params.set('folio_id', item.folio_id);
      navigate({ search: params.toString() });
    }
  };

  const renderItemCard = (item) => {
    const avail = availability[item.folio_id];
    const isAvail = avail?.available > 0;

    return (
      <Col xs={12} md={6} lg={4} key={item.id} className="mb-4">
        <Card
          className="h-100 border-0 shadow-sm hover-scale transition-all"
          style={{
            cursor: 'pointer',
            borderRadius: '12px',
            overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onClick={() => handleCardClick(item)}
        // Inline hover effect can be managed via CSS class 'hover-scale'
        >
          <div className="position-relative bg-light d-flex align-items-center justify-content-center" style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
            <img
              src={`${baseUrl}/inventory/get-image-data?id=${item.id}`}
              alt={`${item.title} - ${avail ? (isAvail ? `${avail.available} of ${avail.total} available` : 'Currently checked out') : 'Loading availability'}`}
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '1rem' }}
              loading="lazy"
            />
            <div className="position-absolute top-0 end-0 p-2">
              {avail ? (
                <Badge color={isAvail ? 'success' : 'danger'} pill className="shadow-sm">
                  {isAvail ? 'Available' : 'Checked Out'}
                </Badge>
              ) : (
                <Badge color="light" className="text-dark shadow-sm">Checking...</Badge>
              )}
            </div>
          </div>
          <CardBody className="d-flex flex-column">
            <div className="mb-2">
              <Badge color="light" className="text-dark border border-secondary me-2">{getSchoolName(item.owner)}</Badge>
              {(Array.isArray(item.branches) ? item.branches : (item.branch ? [item.branch] : [])).map((branchCode, idx) => (
                <Badge key={idx} color="dark" className="text-white me-1" pill aria-label={`Available at ${formatBranchName(branchCode)}`}>{formatBranchName(branchCode)}</Badge>
              ))}
            </div>
            <CardTitle tag="h2" className="fw-bold mb-2" style={{ color: theme.title, fontSize: '1.25rem' }}>{item.title}</CardTitle>
            <CardText className="small mb-3 flex-grow-1 text-truncate-3" style={{ color: theme.desc }}>
              <div dangerouslySetInnerHTML={{ __html: item.description }} />
            </CardText>

            <div className="mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
              <span className="small text-dark fw-medium">
                {avail ? (
                  isAvail
                    ? `${avail.available} of ${avail.total} available`
                    : 'Unavailable'
                ) : 'Loading status...'}
              </span>
              <Button size="sm" color="primary" className="rounded-pill px-3">View Details</Button>
            </div>
          </CardBody>
        </Card>
      </Col>
    );
  };

  const renderTableView = (items) => (
    <div className="table-responsive bg-white rounded shadow-sm">
      <Table hover className="mb-0 align-middle" style={{ tableLayout: 'fixed' }}>
        <thead className="bg-light">
          <tr>
            <th style={{ width: '80px' }} className="ps-4">Image</th>
            <th className="text-start" style={{ width: '20%' }}>Title</th>
            <th style={{ width: '30%' }}>Description</th>
            <th style={{ width: '15%' }}>Location</th>
            <th style={{ width: '15%' }}>Library</th>
            <th style={{ width: '10%' }}>Status</th>
            <th className="text-end pe-4" style={{ width: '80px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const avail = availability[item.folio_id];
            const isAvail = avail?.available > 0;
            return (
              <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => handleCardClick(item)}>
                {/* Image */}
                <td className="ps-4">
                  <div className="bg-light rounded d-flex align-items-center justify-content-center border" style={{ width: '60px', height: '60px' }}>
                    <img
                      src={`${baseUrl}/inventory/get-image-data?id=${item.id}`}
                      alt=""
                      style={{ maxWidth: '100%', maxHeight: '100%', padding: '4px' }}
                      loading="lazy"
                    />
                  </div>
                </td>

                {/* Title */}
                <td className="text-start">
                  <div className="fw-bold text-dark" style={{ color: theme.title }}>{item.title}</div>
                </td>

                {/* Description */}
                <td>
                  <div 
                    className="small text-muted text-truncate" 
                    title={stripHtml(item.description || '')}
                    dangerouslySetInnerHTML={{ __html: item.description }}
                  />
                </td>

                {/* Location (Owner) */}
                <td>
                  <Badge color="light" className="text-dark border">
                    {getLocationName(item.owner)}
                  </Badge>
                </td>

                {/* Library (Branch) */}
                <td>
                  {(Array.isArray(item.branches) ? item.branches : (item.branch ? [item.branch] : [])).length > 0 ? (
                    <span className="text-dark small fw-medium">
                      {(Array.isArray(item.branches) ? item.branches : (item.branch ? [item.branch] : [])).map(b => formatBranchName(b)).join(', ')}
                    </span>
                  ) : (
                    <span className="text-muted small">--</span>
                  )}
                </td>

                {/* Status */}
                <td>
                  {avail ? (
                    <Badge color={isAvail ? 'success' : 'danger'} pill className="shadow-sm">
                      {isAvail ? `${avail.available} Available` : 'Checked Out'}
                    </Badge>
                  ) : (
                    <Badge color="light" className="text-dark">Checking...</Badge>
                  )}
                </td>

                {/* Action */}
                <td className="text-end pe-4">
                  <Button size="sm" color="primary" outline className="rounded-pill">View</Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );

  // --- Render ---
  return (
    <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: theme.bg }}>
      {/* Skip to main content link for screen readers */}
      <a href="#main-content" className="visually-hidden-focusable position-absolute top-0 start-0 bg-primary text-white p-3 m-2 rounded" style={{ zIndex: 9999 }}>
        Skip to main content
      </a>

      {/* Header */}
      <header className="py-3" role="banner">
        <Container>
          <div className="text-center">
            {showLoading ? (
              <div className="d-flex flex-column align-items-center gap-3">
                <Skeleton width={300} height={40} />
                <Skeleton width={500} height={20} />
              </div>
            ) : (
              <>
                {useLogo && logoUrl && !logoError ? (
                  <img
                    src={logoUrl}
                    alt={logoAlt}
                    onError={() => setLogoError(true)}
                    className="mb-3"
                    style={{
                      maxHeight: `${logoHeight}px`,
                      width: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <p className="text-uppercase ls-2 fw-bold mb-2 h6" style={{ color: theme.headerText, letterSpacing: '2px' }} dangerouslySetInnerHTML={{ __html: libraryName }} />
                )}
                <h1 className="fw-bold mb-3" style={{ color: theme.headerText, fontSize: `${headerTextSize}rem` }} dangerouslySetInnerHTML={{ __html: headerText }} />
              </>
            )}
          </div>
        </Container>
      </header>

      {/* Main Content Area */}
      <main id="main-content" role="main" className="flex-grow-1">
        <Container className="py-4">
          {/* Filter Bar */}
          <nav aria-label="Filter and search controls" className="mb-4">
            <Card className="shadow-sm border-0" style={{ zIndex: 100, top: '20px' }}>
              <CardBody className="p-3">
                {/* Row 1: Search (full width) */}
                <Row className="g-3 mb-3">
                  <Col xs={12}>
                    <div role="search">
                      <label htmlFor="search-input" className="visually-hidden">Search gadgets and equipment</label>
                      <InputGroup>
                        <InputGroupText className="bg-white border-end-0" aria-hidden="true"><i className="bi bi-search text-dark"></i></InputGroupText>
                        <Input
                          id="search-input"
                          className="border-start-0 ps-0"
                          placeholder="Search gadgets, equipment..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          aria-label="Search gadgets and equipment"
                          type="search"
                        />
                      </InputGroup>
                    </div>
                  </Col>
                </Row>

                {/* Row 2: Unified filter row — branch + custom filters as equal-width columns */}
                <Row className="g-3 mb-3">
                  <Col xs={12} sm={6} md>
                    <label htmlFor="branch-filter" className="visually-hidden">Filter by library location</label>
                    <Input
                      id="branch-filter"
                      type="select"
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      aria-label="Filter by library location"
                    >
                      <option value="">All Libraries</option>
                      {filteredBranches.map(b => (
                        <option key={b.id} value={b.code}>{b.name}</option>
                      ))}
                    </Input>
                  </Col>
                  {filterGroups.length > 0 && (
                    <Col xs={12} sm={6} md>
                      <CombinedFilterDropdown
                        groups={filterGroups}
                        selectedByGroup={selectedCustomFilters}
                        onToggle={toggleCustomFilterValue}
                        placeholder="All Filters"
                        ariaLabel="Filter items"
                      />
                    </Col>
                  )}
                </Row>

                {/* Active custom-filter chips — shared row keeps the controls from reflowing */}
                {activeCustomChips.length > 0 && (
                  <div className="d-flex flex-wrap gap-1 mb-3">
                    {activeCustomChips.map((chip) => (
                      <Badge
                        key={`${chip.groupSlug}:${chip.value}`}
                        color="light"
                        className="text-dark border d-inline-flex align-items-center gap-1"
                        pill
                      >
                        {chip.label}
                        <button
                          type="button"
                          className="btn-close btn-close-sm"
                          aria-label={`Remove ${chip.label}`}
                          onClick={() => removeCustomFilterValue(chip.groupSlug, chip.value)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Row 3: Controls */}
                <Row>
                  <Col xs={12} className="d-flex justify-content-end align-items-center gap-3 flex-wrap">

                    {/* View Toggle (Segmented Control) */}
                    <div role="group" aria-label="View mode selection" className="bg-light rounded-pill p-1 d-flex" style={{ border: '1px solid #dee2e6' }}>
                      <Button
                        color={viewMode === 'grid' ? 'white' : 'transparent'}
                        className={`view-mode-btn rounded-pill border-0 px-3 py-1 d-flex align-items-center gap-2 small fw-bold text-nowrap transition-all ${viewMode === 'grid' ? 'shadow-sm' : ''}`}
                        style={{ transition: 'all 0.2s', color: viewMode === 'grid' ? '#212529' : '#495057' }}
                        onClick={() => setViewMode('grid')}
                        aria-pressed={viewMode === 'grid'}
                        aria-label="Grid view"
                      >
                        <i className="bi bi-grid-fill" aria-hidden="true"></i> Grid
                      </Button>
                      <Button
                        color={viewMode === 'list' ? 'white' : 'transparent'}
                        className={`view-mode-btn rounded-pill border-0 px-3 py-1 d-flex align-items-center gap-2 small fw-bold text-nowrap transition-all ${viewMode === 'list' ? 'shadow-sm' : ''}`}
                        style={{ transition: 'all 0.2s', color: viewMode === 'list' ? '#212529' : '#495057' }}
                        onClick={() => setViewMode('list')}
                        aria-pressed={viewMode === 'list'}
                        aria-label="Table view"
                      >
                        <i className="bi bi-list-ul" aria-hidden="true"></i> Table
                      </Button>
                    </div>

                    <div className="vr h-50 my-auto text-secondary opacity-25 d-none d-md-block" role="separator" aria-hidden="true"></div>

                    {/* Available Toggle Button */}
                    <Button
                      color={showAvailableOnly ? 'success' : 'outline-dark'}
                      className={`rounded-pill d-flex align-items-center gap-2 ${showAvailableOnly ? 'text-white' : 'text-dark'}`}
                      onClick={() => setShowAvailableOnly(!showAvailableOnly)}
                      aria-pressed={showAvailableOnly}
                      aria-label={showAvailableOnly ? 'Showing available items only. Click to show all items.' : 'Showing all items. Click to show available only.'}
                    >
                      <i className={`bi ${showAvailableOnly ? 'bi-check-circle-fill' : 'bi-check-circle'}`} aria-hidden="true"></i>
                      <span className="small fw-bold">Available Only</span>
                    </Button>

                    {/* Group Toggle Button */}
                    <Button
                      color={groupByBranch ? 'primary' : 'outline-dark'}
                      className={`rounded-pill d-flex align-items-center gap-2 ${groupByBranch ? 'text-white' : 'text-dark'}`}
                      onClick={() => setGroupByBranch(!groupByBranch)}
                      aria-pressed={groupByBranch}
                      aria-label={groupByBranch ? 'Items grouped by library. Click to ungroup.' : 'Items not grouped. Click to group by library.'}
                    >
                      <i className={`bi ${groupByBranch ? 'bi-collection-fill' : 'bi-collection'}`} aria-hidden="true"></i>
                      <span className="small fw-bold">Group by Library</span>
                    </Button>

                  </Col>
                </Row>
              </CardBody>
            </Card>
          </nav>

          {/* Content Grid */}
          <div className="mt-4 py-5">
          {isLoading && !isPreview ? (
            <Row>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Col md={4} key={i} className="mb-4">
                  <Skeleton height={300} borderRadius={12} />
                </Col>
              ))}
            </Row>
          ) : (
            <>
              {filteredItems.length === 0 ? (
                <div className="text-center py-5" role="status" aria-live="polite">
                  <div className="text-muted mb-3" aria-hidden="true"><i className="bi bi-inbox display-1"></i></div>
                  <h2 className="text-secondary">No items found</h2>
                  <p className="text-muted">Try adjusting your search or filters.</p>
                  <Button color="outline-primary" onClick={() => { setSearchQuery(''); setSelectedBranch(''); setShowAvailableOnly(false); setSelectedCustomFilters({}); }}>Clear Filters</Button>
                </div>
              ) : groupByBranch ? (
                Object.keys(groupedItems).sort().map(branchCode => (
                  <section key={branchCode} className="mb-5 fade-in" aria-labelledby={`section-${branchCode}`}>
                    {branchCode !== 'Unassigned' && (
                      <h2 id={`section-${branchCode}`} className="mb-3 border-bottom pb-2" style={{ color: theme.headerText }}>{formatBranchName(branchCode)}</h2>
                    )}
                    {viewMode === 'grid' ? (
                      <Row>
                        {groupedItems[branchCode].map(renderItemCard)}
                      </Row>
                    ) : (
                      renderTableView(groupedItems[branchCode])
                    )}
                  </section>
                ))
              ) : (
                viewMode === 'grid' ? (
                  <Row>
                    {filteredItems.map(renderItemCard)}
                  </Row>
                ) : (
                  renderTableView(filteredItems)
                )
              )}
            </>
          )}
          </div>
        </Container>
      </main>

      {/* Footer */}
      <footer className="footer py-5 mt-auto" role="contentinfo" style={{ backgroundColor: theme.footerBg }}>
        <Container className="text-center">
          <div
            className="custom-footer-content mx-auto mb-4"
            style={{ color: theme.footerText, maxWidth: '800px' }}
            dangerouslySetInnerHTML={{ __html: footerText }}
          />
          <div className="d-inline-block">
            <LoginButton />
          </div>
        </Container>
      </footer>

      {/* Item Modal */}
      {selectedItem && (
        <ItemModal isOpen={!!selectedItem} toggle={toggleModal} item={selectedItem} />
      )}

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: theme.title || '#007bff',
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
          }}
          className="scroll-to-top-btn"
          title="Scroll to top"
        >
          <ArrowUp size={24} />
        </Button>
      )}

      {/* Global Styles for Hover Effects and A11Y */}
      <style>{`
          /* Hover effects */
          .hover-scale:hover {
              transform: translateY(-5px);
              box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important;
          }
          .scroll-to-top-btn:hover {
              transform: translateY(-3px);
              box-shadow: 0 6px 16px rgba(0,0,0,0.2)!important;
          }
          
          /* Focus indicators for accessibility */
          .view-mode-btn:focus-visible {
              outline: 3px solid #0d6efd;
              outline-offset: 2px;
              box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.25);
          }
          
          button:focus-visible, 
          a:focus-visible,
          input:focus-visible,
          select:focus-visible {
              outline: 3px solid #0d6efd;
              outline-offset: 2px;
          }
          
          .visually-hidden-focusable:not(:focus):not(:focus-within) {
              position: absolute !important;
              width: 1px !important;
              height: 1px !important;
              padding: 0 !important;
              margin: -1px !important;
              overflow: hidden !important;
              clip: rect(0, 0, 0, 0) !important;
              white-space: nowrap !important;
              border: 0 !important;
          }
          .text-truncate-3 {
              display: -webkit-box;
              -webkit-line-clamp: 3;
              -webkit-box-orient: vertical;
              overflow: hidden;
          }
          .text-truncate-3 a {
              color: inherit;
              text-decoration: underline;
              text-decoration-color: currentColor;
              opacity: 0.9;
          }
          .text-truncate-3 a:hover {
              opacity: 1;
              text-decoration-thickness: 2px;
          }
          .text-truncate-3 p {
              margin: 0;
          }
          /* Table view description styling */
          .text-truncate div {
              display: inline;
          }
          .text-truncate a {
              color: inherit;
              text-decoration: underline;
              text-decoration-color: currentColor;
              opacity: 0.9;
          }
          .text-truncate a:hover {
              opacity: 1;
              text-decoration-thickness: 2px;
          }
          .text-truncate p, .text-truncate-3 p {
              display: inline;
              margin: 0;
          }
          .text-truncate ul, .text-truncate ol,
          .text-truncate-3 ul, .text-truncate-3 ol {
              margin: 0;
              padding-left: 1.5em;
          }
          /* Force Footer Text Inheritance & Style Links */
          .custom-footer-content, .custom-footer-content * {
              color: inherit !important;
          }
          .custom-footer-content a {
              text-decoration: underline !important;
              text-decoration-color: #0d6efd !important;
              text-underline-offset: 3px;
              text-decoration-thickness: 2px;
              font-weight: 600;
              opacity: 0.95;
          }
          .custom-footer-content a:hover {
              text-decoration-color: #0a58ca !important;
              opacity: 1;
          }
      `}</style>
    </div>
  );
}

SchoolPage.propTypes = {
  isPreview: PropTypes.bool,
  customStyles: PropTypes.shape({
    colorData: PropTypes.array.isRequired,
    layoutData: PropTypes.array.isRequired,
  }),
  customInventoryData: PropTypes.array,
};

export default SchoolPage;
