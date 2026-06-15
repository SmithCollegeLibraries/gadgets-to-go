import React from 'react';
import { NavLink } from 'react-router-dom';
import classnames from 'classnames';
import './AdminSidebar.css';

const AdminSidebar = ({ activeTab, setActiveTab }) => {
    const menuItems = [
        { id: 'inventory', label: 'Inventory Management', icon: '📦' },
        { id: 'styles', label: 'Style Editor', icon: '🎨' },
        { id: 'branches', label: 'Branch Management', icon: '🏛️' },
        { id: 'users', label: 'User Management', icon: '👥' },
    ];

    return (
        <aside className="admin-sidebar" role="complementary" aria-label="Admin navigation">
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
                <NavLink to="/" className="sidebar-link return-link" aria-label="Return to home page">
                    <span className="sidebar-icon" aria-hidden="true">🏠</span>
                    <span className="sidebar-label">Back to Home</span>
                </NavLink>
            </div>
        </aside>
    );
};

export default AdminSidebar;
