import './App.css';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate
} from 'react-router-dom';
import SchoolPage from './pages/SchoolPage';
import Home from './pages/Home'; // Imported Home

import { useState, useEffect } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import RequestAccess from './pages/RequestAccess';
import ProtectedRoutePage from './components/ProtectedRoutePage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Home component moved to src/pages/Home.jsx
function App() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true); // New state to track loading
  const location = useLocation();
  const navigate = useNavigate();
  // useTokenValidation();  // Custom hook to validate token
  // Check authorization when the app loads (after Shibboleth redirects)
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const urlToken = queryParams.get('token');
    const existingToken = localStorage.getItem('authToken');

    if (urlToken) {
      console.log('Token found in URL, saving and cleaning...');
      localStorage.setItem('authToken', urlToken);
      setIsAuthorized(true);

      // Remove token from URL query params
      queryParams.delete('token');
      const newSearch = queryParams.toString();
      const newPath = location.pathname + (newSearch ? `?${newSearch}` : '');

      // Replace current history entry with cleaned URL
      navigate(newPath, { replace: true });
    } else if (existingToken) {
      // console.log('Token found in storage');
      setIsAuthorized(true);
    } else {
      console.log('No token found, user unauthorized.');
      setIsAuthorized(false);
    }

    setLoading(false);  // Token check is complete, stop loading
  }, [location, navigate]);

  if (loading) {
    return <div>Loading...</div>;  // Show a loading screen while checking token
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/school" element={<Home />} />
      <Route path="/protected-route" element={<ProtectedRoutePage />} />
      <Route path="/school/:school" element={<SchoolPage />} />
      <Route path="/admin"
        element={
          <ProtectedRoute isAuthorized={isAuthorized}>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/:location"
        element={
          <ProtectedRoute isAuthorized={isAuthorized}>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/request-access'
        element={<RequestAccess />}
      />
    </Routes>
  );
}

function RootApp() {
  const isStaging = import.meta.env.MODE === 'staging';
  
  return (
    <Router basename={import.meta.env.BASE_URL}>
      {isStaging && (
        <div style={{
          backgroundColor: '#ff6b35',
          color: 'white',
          padding: '12px 20px',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '16px',
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          borderBottom: '3px solid #d84315'
        }}>
          ⚠️ STAGING ENVIRONMENT - This is not the production site ⚠️
        </div>
      )}
      <App />
      <ToastContainer />
    </Router>
  );
}

export default RootApp;
