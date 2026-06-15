
import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';

const LoginButton = () => {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const toggleInfoModal = () => setIsInfoModalOpen(!isInfoModalOpen);

  const handleLogin = () => {
    // Build return URL with current origin
    const returnUrl = `${window.location.origin}/admin/smith`;
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
            <strong>Important:</strong> Only approved library staff have access to manage Gadgets to Go.
            Please check with your library's Access Service department before trying to log in.
          </p>
          <p>
            If you are authorized library staff, click "Proceed to Login" to continue.
            Otherwise, please contact your library's Access Services department for assistance.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={proceedToLogin}>
            Proceed to Login
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
