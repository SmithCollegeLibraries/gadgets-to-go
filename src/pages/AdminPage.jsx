// AdminPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import useSchoolStore from '../store/schoolStore';
// import Header from '../components/Admin/Header'; // Removed old header
import AdminSidebar from '../components/Admin/AdminSidebar'; // New Sidebar
import './AdminPage.css'; // Import custom CSS for additional styling

import useFetchInventory from '../hooks/useFetchInventory';
import useFetchStyles from '../hooks/useFetchStyles';
import useFetchLayoutData from '../hooks/useFetchLayoutData';
import InventoryTab from '../components/Admin/tabs/InventoryTab';
// import AddItemTab from '../components/Admin/tabs/AddItemTab'; // Removed
import EditStylesTab from '../components/Admin/tabs/EditStylesTab';
import BranchManagementTab from '../components/Admin/tabs/BranchManagementTab';
import UserManagementTab from '../components/Admin/tabs/UserManagementTab';
import SchoolPage from './SchoolPage';
import SaveChangesButton from '../components/Admin/SaveChangesButton'; // If you have a save button component
import useTokenValidation from '../hooks/useTokenValidation';

function AdminPage() {
  const { baseUrl } = useSchoolStore();
  const { isTokenExpired } = useTokenValidation();
  const navigate = useNavigate();
  const locationAbbreviations = {
    amherst: 'AMH',
    hampshire: 'HMC',
    mtholyoke: 'MHC',
    smith: 'SMC',
    umass: 'UMA',
  };
  const { location } = useParams();
  const token = localStorage.getItem('authToken');
  const mapLocations = locationAbbreviations[location];

  const [activeTab, setActiveTab] = useState('inventory');

  const [originalStyles, setOriginalStyles] = useState({});
  const [originalLayoutData, setOriginalLayoutData] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [localStyles, setLocalStyles] = useState({
    titleColor: '#000000',
    headerTextColor: '#000000',
    descriptionColor: '#333333',
    footer: '#f0f0f0',
    footerBackgroundColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  });



  const [localInventoryData, setLocalInventoryData] = useState([]);
  const [localLayoutData, setLocalLayoutData] = useState([
    { name: 'libraryName', text: '' },
    { name: 'headerText', text: '' },
    { name: 'footerText', text: '' },
  ]);

  // Fetch inventory, styles, and layout data using custom hooks
  const [inventoryData] = useFetchInventory(baseUrl, mapLocations, refreshTrigger);
  const [styles] = useFetchStyles(baseUrl, mapLocations, {});
  const [layoutData] = useFetchLayoutData(baseUrl, mapLocations);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (isTokenExpired(token)) {
      // Optionally, handle any UI updates here
      console.log('Token has expired, logging out...');
    }
  }, [isTokenExpired]);

  // Initialize local styles and inventory data with fetched data
  useEffect(() => {
    if (styles && Object.keys(styles).length > 0) {
      setLocalStyles(styles);
      setOriginalStyles(styles);
    }
  }, [styles]);

  useEffect(() => {
    if (layoutData && layoutData.length > 0) {
      setLocalLayoutData(layoutData);
      setOriginalLayoutData(layoutData);
    }
  }, [layoutData]);

  useEffect(() => {
    console.log('inventoryData changed:', inventoryData);

    if (inventoryData) {
      setLocalInventoryData(inventoryData);
    }
  }, [inventoryData]);

  useEffect(() => {
    if (layoutData.length > 0) {
      setLocalLayoutData(layoutData);
    }
  }, [layoutData]);

  // Handle style changes
  const handleStyleChange = (e) => {
    const { name, value } = e.target;
    setLocalStyles((prevStyles) => ({
      ...prevStyles,
      [name]: value,
    }));
  };

  // Handle layout data changes
  const handleLayoutChange = (name, value) => {
    setLocalLayoutData((prevLayoutData) => {
      const existingItem = prevLayoutData.find(item => item.name === name);
      
      if (existingItem) {
        // Update existing item
        return prevLayoutData.map((item) =>
          item.name === name ? { ...item, text: value } : item
        );
      } else {
        // Add new item if it doesn't exist
        return [...prevLayoutData, { name, text: value }];
      }
    });
  };

  // Reset styles and layout data
  const handleResetStyles = () => {
    setLocalStyles(originalStyles);
    setLocalLayoutData(originalLayoutData);
  };


  // Function to refresh inventory data after adding a new item
  const refreshInventory = () => {
    setRefreshTrigger((prev) => prev + 1);
  };


  const localStylesArray = Object.keys(localStyles).map((key) => ({
    type: key,
    color_hash: localStyles[key],
  }));

  return (
    <div className="admin-dashboard">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="admin-content" role="main">
        <header className="admin-header">
          <h1 className="admin-title">
            {locationAbbreviations[location] ? `${locationAbbreviations[location]} / ` : ''}
            {activeTab === 'inventory' && 'Inventory Management'}
            {activeTab === 'styles' && 'Style Editor'}
            {activeTab === 'branches' && 'Branch & Location Management'}
            {activeTab === 'users' && 'User Management'}
          </h1>
          <div className="user-profile d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <label htmlFor="college-switcher" className="small text-muted mb-0">Switch College:</label>
              <select 
                id="college-switcher"
                className="form-select form-select-sm" 
                value={location} 
                onChange={(e) => {
                  navigate(`/admin/${e.target.value}`);
                  window.location.reload(); // Reload to fetch new data
                }}
                style={{ width: 'auto', minWidth: '180px' }}
                aria-label="Select college to manage"
              >
                <option value="smith">Smith College</option>
                <option value="mtholyoke">Mount Holyoke</option>
                <option value="amherst">Amherst College</option>
                <option value="hampshire">Hampshire College</option>
                <option value="umass">UMass Amherst</option>
              </select>
            </div>
          </div>
        </header>

        <div className="tab-content" role="region" aria-live="polite">
          {activeTab === 'inventory' && (
            <div className="admin-card">
              <InventoryTab
                inventoryData={localInventoryData}
                styles={localStyles}
                baseUrl={baseUrl}
                token={token}
                refreshInventory={refreshInventory}
                setLocalInventoryData={setLocalInventoryData}
                mapLocations={mapLocations}
              />
            </div>
          )}



          {activeTab === 'styles' && (
            <div className="split-view">
              <div className="editor-panel">
                <EditStylesTab
                  styles={localStyles}
                  handleStyleChange={handleStyleChange}
                  handleResetStyles={handleResetStyles}
                  baseUrl={baseUrl}
                  mapLocations={mapLocations}
                  token={token}
                  layoutData={localLayoutData}
                  handleLayoutChange={handleLayoutChange}
                />
                {/* Save Changes Button now inside the editor panel */}
                {/* <div className="mt-4 pt-4 border-t border-gray-200">
                  <SaveChangesButton
                    localStyles={localStyles}
                    baseUrl={baseUrl}
                    token={token}
                    mapLocations={mapLocations}
                    localInventoryData={localInventoryData}
                  />
                </div> */}
              </div>

              <div className="preview-panel">
                <div className="preview-header">
                  <div className="preview-dots">
                    <span className="preview-dot red"></span>
                    <span className="preview-dot yellow"></span>
                    <span className="preview-dot green"></span>
                  </div>
                  <span className="text-sm text-gray-500 font-medium">Live Preview</span>
                </div>
                <div className="preview-frame">
                  <SchoolPage
                    isPreview={true}
                    customStyles={{ colorData: localStylesArray, layoutData: localLayoutData }}
                    customInventoryData={localInventoryData}
                  />
                </div>
              </div>
            </div>
          )}
          {activeTab === 'branches' && (
            <div className="admin-card">
              <BranchManagementTab
                baseUrl={baseUrl}
                token={token}
                mapLocations={mapLocations}
              />
            </div>
          )}
          {activeTab === 'users' && (
            <div className="admin-card">
              <UserManagementTab
                baseUrl={baseUrl}
                token={token}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminPage;
