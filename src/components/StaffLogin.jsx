
import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input, Label } from 'reactstrap';
import useSchoolStore from '../store/schoolStore';

const LoginButton = () => {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [localUsername, setLocalUsername] = useState('');
  const [localPassword, setLocalPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const { appConfig, baseUrl } = useSchoolStore();
  const appName = appConfig.appName || 'Library Equipment';
  const localAuthEnabled = (appConfig.authProviders || []).includes('local');

  const toggleInfoModal = () => setIsInfoModalOpen(!isInfoModalOpen);

  const handleLogin = () => {
    const defaultInstitution = appConfig.institutions?.[0]?.slug || '';
    const adminPath = defaultInstitution ? `/admin/${defaultInstitution}` : '/admin';
    // Build return URL with current origin
    const returnUrl = `${window.location.origin}${adminPath}`;
    const authUrl = `${import.meta.env.VITE_AUTH_URL}?return_url=${encodeURIComponent(returnUrl)}`;
    
    // Redirect the user to the authorize.php script for Shibboleth login
    window.location.href = authUrl;
  };

  const handleLoginClick = () => {
    // Show info modal first
    setIsInfoModalOpen(true);
  };

  const proceedToLogin = () => {
    setIsInfoModalOpen(false);
    handleLogin();
  };

  const handleLocalLogin = async () => {
    setLocalError('');
    try {
      const response = await fetch(`${baseUrl}/auth/local-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: localUsername, password: localPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.name || 'Local login failed');
      }
      localStorage.setItem('authToken', data.token);
      const defaultInstitution = appConfig.institutions?.[0]?.slug || '';
      window.location.href = defaultInstitution ? `/admin/${defaultInstitution}` : '/admin';
    } catch (error) {
      setLocalError(error.message);
    }
  };

  return (
    <>
      <button onClick={handleLoginClick} className="btn btn-primary">
        Admin Login
      </button>

      {/* Information Modal */}
      <Modal isOpen={isInfoModalOpen} toggle={toggleInfoModal}>
        <ModalHeader toggle={toggleInfoModal}>Access Information</ModalHeader>
        <ModalBody>
          <p>
            <strong>Important:</strong> Only approved library staff have access to manage {appName}.
            Please check with your library&apos;s Access Service department before trying to log in.
          </p>
          <p>
            If you are authorized library staff, click &quot;Proceed to Login&quot; to continue.
            Otherwise, please contact your library&apos;s Access Services department for assistance.
          </p>
          {localAuthEnabled && (
            <div className="border-top pt-3 mt-3">
              <div className="mb-2">
                <Label for="local-username">Local username</Label>
                <Input id="local-username" value={localUsername} onChange={(e) => setLocalUsername(e.target.value)} />
              </div>
              <div className="mb-2">
                <Label for="local-password">Local password</Label>
                <Input id="local-password" type="password" value={localPassword} onChange={(e) => setLocalPassword(e.target.value)} />
              </div>
              {localError && <div className="text-danger small">{localError}</div>}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {localAuthEnabled && (
            <Button color="success" onClick={handleLocalLogin}>
              Local Login
            </Button>
          )}
          <Button color="primary" onClick={proceedToLogin}>
            Shibboleth Login
          </Button>
          <Button color="secondary" onClick={toggleInfoModal}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default LoginButton;
