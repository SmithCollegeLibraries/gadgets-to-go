import './App.css';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate
} from 'react-router-dom';
import Home from './pages/Home'; // Imported Home

import { lazy, Suspense, useState, useEffect } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedRoutePage from './components/ProtectedRoutePage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import useSchoolStore from './store/schoolStore';
import { isSetupConfigEnabled } from './utils/setupAccess';
import { exchangeAuthCode } from './utils/authCodeExchange';
// Home component moved to src/pages/Home.jsx
const SetupConfig = lazy(() => import('./pages/SetupConfig'));
const SchoolPage = lazy(() => import('./pages/SchoolPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const RequestAccess = lazy(() => import('./pages/RequestAccess'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

function LoadingRoute({ label = 'Loading...' }) {
  return (
    <div className="page-container d-flex align-items-center justify-content-center" role="status" aria-live="polite">
      {label}
    </div>
  );
}

function SetupConfigDisabled() {
  return (
    <div className="page-container d-flex align-items-center justify-content-center">
      <div className="card text-start" style={{ maxWidth: '640px' }}>
        <h1 className="h4">Setup generator disabled</h1>
        <p className="mb-0">
          The configuration generator is disabled in this environment. Set
          {' '}<code>VITE_ENABLE_SETUP_CONFIG=true</code> and restart the frontend only while generating a new setup file.
        </p>
      </div>
    </div>
  );
}

function App() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true); // New state to track loading
  const location = useLocation();
  const navigate = useNavigate();
  const setupConfigEnabled = isSetupConfigEnabled();
  const { baseUrl } = useSchoolStore();
  // useTokenValidation();  // Custom hook to validate token
  // Check authorization when the app loads (after Shibboleth redirects)
  useEffect(() => {
    let cancelled = false;

    const queryParams = new URLSearchParams(location.search);
    const authCode = queryParams.get('auth_code');
    const existingToken = localStorage.getItem('authToken');

    const finishAuth = (authorized) => {
      if (cancelled) return;
      setIsAuthorized(authorized);
      setLoading(false);
    };

    const cleanAuthCodeFromUrl = () => {
      queryParams.delete('auth_code');
      const newSearch = queryParams.toString();
      const newPath = location.pathname + (newSearch ? `?${newSearch}` : '');
      navigate(newPath, { replace: true });
    };

    if (authCode) {
      exchangeAuthCode(baseUrl, authCode)
        .then((token) => {
          localStorage.setItem('authToken', token);
          cleanAuthCodeFromUrl();
          finishAuth(true);
        })
        .catch(() => {
          localStorage.removeItem('authToken');
          cleanAuthCodeFromUrl();
          finishAuth(false);
        });
    } else {
      finishAuth(Boolean(existingToken));
    }

    return () => {
      cancelled = true;
    };
  }, [baseUrl, location, navigate]);

  if (loading) {
    return <LoadingRoute />;  // Show a loading screen while checking token
  }

  return (
    <Suspense fallback={<LoadingRoute />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/school" element={<Home />} />
        <Route
          path="/setup-config"
          element={
            setupConfigEnabled ? (
              <SetupConfig />
            ) : (
              <SetupConfigDisabled />
            )
          }
        />
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
        <Route
          path='/reset-password'
          element={<ResetPassword />}
        />
      </Routes>
    </Suspense>
  );
}

function RootApp() {
  const isStaging = import.meta.env.MODE === 'staging';
  const { appConfig, loadConfig } = useSchoolStore();

  useEffect(() => {
    loadConfig().catch((error) => console.error('Unable to load application configuration', error));
  }, [loadConfig]);

  useEffect(() => {
    document.title = appConfig.appName || 'Library Equipment';
  }, [appConfig.appName]);
  
  return (
    <Router basename={import.meta.env.BASE_URL}>
      {isStaging && (
        <header style={{
          backgroundColor: '#a73712',
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
        </header>
      )}
      <App />
      <ToastContainer />
    </Router>
  );
}

export default RootApp;
