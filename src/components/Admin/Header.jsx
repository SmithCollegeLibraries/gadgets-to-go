import useSchoolStore from '../../store/schoolStore';

function Header() {
  const appName = useSchoolStore((state) => state.appConfig.appName || 'Library Equipment');

  const handleLogout = () => {
    // Remove the authentication token from localStorage
    const currentUrl = window.location.href;
    localStorage.setItem('lastPage', currentUrl);
  
    // Remove token from storage
    localStorage.removeItem('authToken');

    window.location.href = `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/logout`;

  };

  return (
    <nav className="navbar fixed-top bg-body-tertiary bg-primary">
      <div className="container-fluid">
        <span className="navbar-brand mb-0">{appName} Admin</span>
        <form className="d-flex justify-content-end">
          <button type="button" className="btn btn-primary" onClick={handleLogout}>
            Log out
          </button>
        </form>
      </div>
    </nav>
  );
}

export default Header;
