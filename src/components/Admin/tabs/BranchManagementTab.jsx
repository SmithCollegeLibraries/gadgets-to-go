import { useState, useEffect, useCallback } from 'react';
import {
  Card, CardBody, CardTitle, Button, Table, Badge, Input, FormGroup,
  Modal, ModalHeader, ModalBody, ModalFooter, Alert
} from 'reactstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import { branches as allBranches } from '../../../data/branches';
import { locations as allLocations } from '../../../data/locations';

function BranchManagementTab({ baseUrl, token, mapLocations }) {
  const [disabledBranches, setDisabledBranches] = useState([]);
  const [disabledLocations, setDisabledLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Filter branches and locations based on school
  const getFilteredBranches = () => {
    let prefix = '';
    if (mapLocations === 'SMC') prefix = 'SC';
    else if (mapLocations === 'MHC') prefix = 'MH';
    else if (mapLocations === 'AMH') prefix = 'AC';
    else if (mapLocations === 'HMC') prefix = 'HC';
    else if (mapLocations === 'UMA') prefix = 'UM';
    
    return allBranches.filter(b => b.code.startsWith(prefix));
  };

  const getFilteredLocations = () => {
    let prefix = '';
    if (mapLocations === 'SMC') prefix = 'SC';
    else if (mapLocations === 'MHC') prefix = 'MH';
    else if (mapLocations === 'AMH') prefix = 'AC';
    else if (mapLocations === 'HMC') prefix = 'HC';
    else if (mapLocations === 'UMA') prefix = 'UM';
    
    // Filter by name prefix (first two characters of name)
    return allLocations.filter(l => l.name.startsWith(prefix + ' ') || l.name.startsWith(prefix));
  };

  const filteredBranches = getFilteredBranches();
  const filteredLocations = getFilteredLocations();

  const fetchEnabledItems = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch disabled items from backend
      const response = await axios.get(`${baseUrl}/settings/disabled-items`, {
        params: { owner: mapLocations },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Items in the response are DISABLED
      setDisabledBranches(response.data.branches || []);
      setDisabledLocations(response.data.locations || []);
    } catch (error) {
      // If endpoint doesn't exist yet, nothing is disabled (all enabled)
      console.log('Using default settings - all branches/locations enabled (none disabled)');
      setDisabledBranches([]);
      setDisabledLocations([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, mapLocations, token]);

  // Load enabled branches and locations from backend
  useEffect(() => {
    fetchEnabledItems();
  }, [fetchEnabledItems]);

  const handleBranchToggle = (branchCode) => {
    setDisabledBranches(prev => {
      if (prev.includes(branchCode)) {
        // Currently disabled, remove from disabled list (enable it)
        return prev.filter(b => b !== branchCode);
      } else {
        // Currently enabled, add to disabled list (disable it)
        return [...prev, branchCode];
      }
    });
    setHasChanges(true);
  };

  const handleLocationToggle = (locationCode) => {
    setDisabledLocations(prev => {
      if (prev.includes(locationCode)) {
        // Currently disabled, remove from disabled list (enable it)
        return prev.filter(l => l !== locationCode);
      } else {
        // Currently enabled, add to disabled list (disable it)
        return [...prev, locationCode];
      }
    });
    setHasChanges(true);
  };

  const handleEnableAll = (type) => {
    // Enable all = clear disabled list
    if (type === 'branches') {
      setDisabledBranches([]);
    } else {
      setDisabledLocations([]);
    }
    setHasChanges(true);
  };

  const handleDisableAll = (type) => {
    // Disable all = add all to disabled list
    if (type === 'branches') {
      setDisabledBranches(filteredBranches.map(b => b.code));
    } else {
      setDisabledLocations(filteredLocations.map(l => l.code));
    }
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      await axios.post(
        `${baseUrl}/settings/disabled-items`,
        {
          owner: mapLocations,
          branches: disabledBranches,
          locations: disabledLocations
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Settings saved successfully!');
      setHasChanges(false);
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save settings. Backend endpoint may not be implemented yet.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    fetchEnabledItems();
    setHasChanges(false);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="branch-management-tab">


      {hasChanges && (
        <Alert color="warning" className="mb-4 d-flex justify-content-between align-items-center">
          <span><i className="bi bi-exclamation-triangle me-2"></i>You have unsaved changes</span>
          <div className="d-flex gap-2">
            <Button color="secondary" size="sm" onClick={handleReset}>
              Reset
            </Button>
            <Button color="success" size="sm" onClick={handleSaveChanges} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Alert>
      )}

      <div className="row">
        {/* Branch Management */}
        <div className="col-lg-6 mb-4">
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <CardTitle tag="h5" className="mb-0">
                  <i className="bi bi-building me-2"></i>Branch Locations
                </CardTitle>
                <div className="btn-group btn-group-sm">
                  <Button color="outline-success" onClick={() => handleEnableAll('branches')}>
                    Enable All
                  </Button>
                  <Button color="outline-danger" onClick={() => handleDisableAll('branches')}>
                    Disable All
                  </Button>
                </div>
              </div>

              <div className="mb-3">
                <Badge color="primary" pill>
                  {filteredBranches.length - disabledBranches.length} of {filteredBranches.length} enabled
                </Badge>
              </div>

              <Table hover responsive size="sm">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '60px' }}>Status</th>
                    <th scope="col">Branch Name</th>
                    <th scope="col" style={{ width: '80px' }}>Code</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBranches.map(branch => {
                    const isEnabled = !disabledBranches.includes(branch.code);
                    return (
                      <tr key={branch.code} className={!isEnabled ? 'text-muted' : ''}>
                        <td>
                          <FormGroup check className="mb-0">
                            <Input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => handleBranchToggle(branch.code)}
                              aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${branch.name.replace(/^[A-Z]{2}\s+/, '')}`}
                            />
                          </FormGroup>
                        </td>
                        <td>
                          {branch.name.replace(/^[A-Z]{2}\s+/, '')}
                          {!isEnabled && (
                            <Badge color="secondary" className="ms-2" pill>Hidden</Badge>
                          )}
                        </td>
                        <td>
                          <code className="small">{branch.code}</code>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </div>

        {/* Location Management */}
        <div className="col-lg-6 mb-4">
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <CardTitle tag="h5" className="mb-0">
                  <i className="bi bi-geo-alt me-2"></i>FOLIO Locations
                </CardTitle>
                <div className="btn-group btn-group-sm">
                  <Button color="outline-success" onClick={() => handleEnableAll('locations')}>
                    Enable All
                  </Button>
                  <Button color="outline-danger" onClick={() => handleDisableAll('locations')}>
                    Disable All
                  </Button>
                </div>
              </div>

              <div className="mb-3">
                <Badge color="primary" pill>
                  {filteredLocations.length - disabledLocations.length} of {filteredLocations.length} enabled
                </Badge>
              </div>

              <Table hover responsive size="sm">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '60px' }}>Status</th>
                    <th scope="col">Location Name</th>
                    <th scope="col" style={{ width: '80px' }}>Code</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocations.map(location => {
                    const isEnabled = !disabledLocations.includes(location.code);
                    return (
                      <tr key={location.code} className={!isEnabled ? 'text-muted' : ''}>
                        <td>
                          <FormGroup check className="mb-0">
                            <Input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => handleLocationToggle(location.code)}
                              aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${location.name}`}
                            />
                          </FormGroup>
                        </td>
                        <td>
                          {location.name}
                          {!isEnabled && (
                            <Badge color="secondary" className="ms-2" pill>Hidden</Badge>
                          )}
                        </td>
                        <td>
                          <code className="small">{location.code}</code>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Help Modal */}
      <Modal isOpen={showHelpModal} toggle={() => setShowHelpModal(false)} size="lg">
        <ModalHeader toggle={() => setShowHelpModal(false)}>
          Branch & Location Management Help
        </ModalHeader>
        <ModalBody>
          <h6>What does this do?</h6>
          <p>
            This feature allows you to control which branches and locations are visible to users
            when browsing equipment, filtering items, or adding new inventory.
          </p>

          <h6 className="mt-3">Backend Requirements</h6>
          <Alert color="warning">
            <strong>Note:</strong> To persist these settings, the following backend endpoints need to be implemented:
          </Alert>
          
          <div className="bg-light p-3 rounded">
            <h6>Required API Endpoints:</h6>
            <ol>
              <li>
                <strong>GET</strong> <code>/api/settings/disabled-items</code>
                <ul>
                  <li>Query params: <code>owner</code> (SMC, MHC, etc.)</li>
                  <li>Returns: <code>{`{ branches: [], locations: [] }`}</code></li>
                  <li>Returns empty arrays if no disabled items exist</li>
                </ul>
              </li>
              <li>
                <strong>POST</strong> <code>/api/settings/disabled-items</code>
                <ul>
                  <li>Body: <code>{`{ owner: "SMC", branches: [], locations: [] }`}</code></li>
                  <li>Saves the DISABLED items for the specified owner</li>
                  <li>Use replace-all strategy (delete existing, insert new)</li>
                </ul>
              </li>
            </ol>

            <h6 className="mt-3">Database Schema Suggestion:</h6>
            <pre className="bg-dark text-light p-3 rounded">
{`CREATE TABLE disabled_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  owner VARCHAR(10) NOT NULL,
  item_type ENUM('branch', 'location') NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_item (owner, item_type, item_code)
);

-- Empty table = all items enabled (default state)
-- Only stores items that have been explicitly disabled`}
            </pre>
          </div>

          <h6 className="mt-3">How it works:</h6>
          <ul>
            <li><strong>Default behavior:</strong> All branches/locations are enabled (empty database)</li>
            <li><strong>Disabled items</strong> are stored in the database and hidden from dropdowns/filters</li>
            <li><strong>Enabled items</strong> are NOT in the database (on by default)</li>
            <li>Changes are saved per institution (SMC, MHC, etc.)</li>
            <li>Existing assignments to disabled items remain intact</li>
          </ul>

          <h6 className="mt-3">Use Cases:</h6>
          <ul>
            <li>Hide deprecated or closed branches from equipment assignment</li>
            <li>Simplify location selection by showing only active locations</li>
            <li>Manage branch visibility during reorganizations</li>
          </ul>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={() => setShowHelpModal(false)}>
            Got it!
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

BranchManagementTab.propTypes = {
  baseUrl: PropTypes.string.isRequired,
  token: PropTypes.string.isRequired,
  mapLocations: PropTypes.string.isRequired,
};

export default BranchManagementTab;
