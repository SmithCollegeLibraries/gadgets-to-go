import { NavLink, useNavigate } from 'react-router-dom';
import classnames from 'classnames';
import './AdminSidebar.css';

const AdminSidebar = ({ activeTab, setActiveTab }) => {
    const navigate = useNavigate();
    const menuItems = [
        { id: 'inventory', label: 'Inventory Management', icon: '📦' },
        { id: 'styles', label: 'Style Editor', icon: '🎨' },
        { id: 'branches', label: 'Branch Management', icon: '🏛️' },
        { id: 'users', label: 'User Management', icon: '👥' },
        { id: 'setup', label: 'Setup Health', icon: '✓' },
    ];

    const handleLogout = async () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('lastPage');
        try {
            await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
        } catch {
            // Local logout should still complete if the server-side logout endpoint is unavailable.
        }
        navigate('/', { replace: true });
    };

    return (
        <aside className="admin-sidebar" aria-label="Admin navigation">
            <div className="sidebar-header">
                <h2 className="h3">Admin Panel</h2>
            </div>
            <nav className="sidebar-nav" role="navigation" aria-label="Admin sections">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={classnames('sidebar-link', { active: activeTab === item.id })}
                        onClick={() => setActiveTab(item.id)}
                        aria-current={activeTab === item.id ? 'page' : undefined}
                        aria-label={item.label}
                    >
                        <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
                        <span className="sidebar-label">{item.label}</span>
                    </button>
                ))}
            </nav>
            <div className="sidebar-footer">
                <button type="button" className="sidebar-link logout-link" onClick={handleLogout}>
                    <span className="sidebar-icon" aria-hidden="true">↪</span>
                    <span className="sidebar-label">Log Out</span>
                </button>
                <NavLink to="/" className="sidebar-link return-link" aria-label="Return to home page">
                    <span className="sidebar-icon" aria-hidden="true">🏠</span>
                    <span className="sidebar-label">Back to Home</span>
                </NavLink>
            </div>
        </aside>
    );
};

export default AdminSidebar;
