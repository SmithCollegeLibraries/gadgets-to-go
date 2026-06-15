import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Badge,
    Card,
    CardBody,
    Input,
    Spinner,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    FormGroup,
    Label
} from 'reactstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';

const UserManagementTab = ({ baseUrl, token }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('pending'); // 'pending' or 'all'

    // Edit Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editFormData, setEditFormData] = useState({
        username: '',
        email: '',
        full_name: '',
        department: '',
        institution: '',
        role: 'user'
    });
    const [saving, setSaving] = useState(false);


    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        if (token) {
            try {
                // Simple JWT parse to get user ID
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const decoded = JSON.parse(jsonPayload);
                // Adjust based on your JWT structure. Usually 'sub' or 'id'
                setCurrentUserId(decoded.data?.id || decoded.sub || decoded.id);
            } catch (e) {
                console.error("Error parsing token", e);
            }
        }
    }, [token]);


    const fetchUsers = async () => {
        setLoading(true);
        try {
            let url = `${baseUrl}/user/index`;
            if (filterType === 'pending') {
                url += '?approved=0';
            }

            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (Array.isArray(response.data)) {
                setUsers(response.data);
            } else {
                setUsers(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [filterType, baseUrl, token]);

    const handleAction = async (action, id) => {
        try {
            let endpoint = '';
            if (action === 'approve') endpoint = `/user/approve/${id}`;
            if (action === 'reject') endpoint = `/user/reject/${id}`;
            if (action === 'delete') endpoint = `/user/delete/${id}`;

            const method = action === 'delete' ? 'delete' : 'post';

            await axios({
                method: method,
                url: `${baseUrl}${endpoint}`,
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(`User ${action}ed successfully`);
            fetchUsers();
        } catch (error) {
            console.error(`Error performing ${action}:`, error);
            toast.error(`Failed to ${action} user.`);
        }
    };

    const handleDeleteClick = (user) => {
        setUserToDelete(user);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (userToDelete) {
            await handleAction('delete', userToDelete.id);
            setDeleteModalOpen(false);
            setUserToDelete(null);
        }
    };

    // --- Edit Logic ---
    const handleEditClick = async (id) => {
        try {
            const response = await axios.get(`${baseUrl}/user/view/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const userData = response.data;
            setEditingUser(userData);
            setEditFormData({
                username: userData.username || '',
                email: userData.email || '',
                full_name: userData.full_name || '',
                department: userData.department || '',
                institution: userData.institution || '',
                role: userData.role || 'user'
            });
            setEditModalOpen(true);
        } catch (error) {
            console.error('Error fetching user details:', error);
            toast.error('Failed to load user details.');
        }
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        setSaving(true);
        try {
            await axios.put(`${baseUrl}/user/update/${editingUser.id}`, editFormData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('User updated successfully');
            setEditModalOpen(false);
            setEditingUser(null);
            fetchUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            toast.error('Failed to update user.');
        } finally {
            setSaving(false);
        }
    };

    // Sorting Logic
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    const sortedUsers = React.useMemo(() => {
        let sortableUsers = [...users];
        if (sortConfig.key !== null) {
            sortableUsers.sort((a, b) => {
                let aValue = a[sortConfig.key] ? a[sortConfig.key].toString().toLowerCase() : '';
                let bValue = b[sortConfig.key] ? b[sortConfig.key].toString().toLowerCase() : '';

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableUsers;
    }, [users, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (name) => {
        if (sortConfig.key !== name) return <i className="bi bi-arrow-down-up text-muted ms-2 opacity-50" style={{ fontSize: '0.9em' }}></i>;
        if (sortConfig.direction === 'ascending') return <i className="bi bi-caret-up-fill text-primary ms-2" style={{ fontSize: '0.9em' }}></i>;
        return <i className="bi bi-caret-down-fill text-primary ms-2" style={{ fontSize: '0.9em' }}></i>;
    };

    // Grouping Logic
    const [groupByInstitution, setGroupByInstitution] = useState(false);

    const groupedUsers = React.useMemo(() => {
        if (!groupByInstitution) return null;
        return sortedUsers.reduce((acc, user) => {
            const inst = user.institution || 'Other';
            if (!acc[inst]) acc[inst] = [];
            acc[inst].push(user);
            return acc;
        }, {});
    }, [sortedUsers, groupByInstitution]);

    const renderUserTable = (userList) => (
        <Table hover responsive className="mb-0 align-middle" aria-label="User management table">
            <thead className="bg-light">
                <tr>
                    <th scope="col" className="border-0 py-3 ps-4 cursor-pointer user-select-none" onClick={() => requestSort('username')}>
                        Name {getSortIcon('username')}
                    </th>
                    <th scope="col" className="border-0 py-3 cursor-pointer user-select-none" onClick={() => requestSort('email')}>
                        Email {getSortIcon('email')}
                    </th>
                    <th scope="col" className="border-0 py-3 cursor-pointer user-select-none" onClick={() => requestSort('institution')}>
                        Institution {getSortIcon('institution')}
                    </th>
                    <th scope="col" className="border-0 py-3 cursor-pointer user-select-none" onClick={() => requestSort('department')}>
                        Department {getSortIcon('department')}
                    </th>
                    <th scope="col" className="border-0 py-3 cursor-pointer user-select-none" onClick={() => requestSort('role')}>
                        Role {getSortIcon('role')}
                    </th>
                    <th scope="col" className="border-0 py-3 cursor-pointer user-select-none" onClick={() => requestSort('approved')}>
                        Status {getSortIcon('approved')}
                    </th>
                    <th scope="col" className="border-0 py-3 text-end pe-4">Actions</th>
                </tr>
            </thead>
            <tbody>
                {userList.map((user) => (
                    <tr key={user.id}>
                        <td className="ps-4 fw-medium">{user.username || 'N/A'}</td>
                        <td>{user.email}</td>
                        <td>{user.institution || '-'}</td>
                        <td>{user.department || '-'}</td>
                        <td>
                            <Badge color="info" pill className="text-dark bg-opacity-25 bg-info border border-info border-opacity-25">
                                {user.role || 'user'}
                            </Badge>
                        </td>
                        <td>
                            {user.approved === 1 ? (
                                <Badge color="success" pill>Active</Badge>
                            ) : (
                                <Badge color="warning" pill className="text-dark">Pending</Badge>
                            )}
                        </td>
                        <td className="text-end pe-4">
                            <div className="d-flex gap-2 justify-content-end">
                                <Button
                                    size="sm"
                                    color="info"
                                    title="Edit User"
                                    onClick={() => handleEditClick(user.id)}
                                    aria-label={`Edit user ${user.username || user.email}`}
                                >
                                    <i className="bi bi-pencil me-1" aria-hidden="true"></i> Edit
                                </Button>
                                {user.approved !== 1 && (
                                    <Button
                                        size="sm"
                                        color="success"
                                        title="Approve User"
                                        onClick={() => handleAction('approve', user.id)}
                                        aria-label={`Approve user ${user.username || user.email}`}
                                    >
                                        <i className="bi bi-check-lg me-1" aria-hidden="true"></i> Approve
                                    </Button>
                                )}
                                {user.approved !== 1 && (
                                    <Button
                                        size="sm"
                                        color="secondary"
                                        title="Reject User"
                                        onClick={() => handleAction('reject', user.id)}
                                        aria-label={`Reject user ${user.username || user.email}`}
                                    >
                                        <i className="bi bi-x-lg me-1" aria-hidden="true"></i> Reject
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    color="danger"
                                    title="Delete User"
                                    disabled={currentUserId && String(currentUserId) === String(user.id)}
                                    onClick={() => handleDeleteClick(user)}
                                    aria-label={`Delete user ${user.username || user.email}`}
                                >
                                    <i className="bi bi-trash me-1" aria-hidden="true"></i> Delete
                                </Button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );

    return (
        <div className="user-management-tab">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">User Management</h2>
                <div className="d-flex align-items-center gap-3">
                    <div className="form-check form-switch d-flex align-items-center gap-2 m-0">
                        <Input
                            className="form-check-input m-0"
                            type="checkbox"
                            id="groupInstitutionSwitch"
                            checked={groupByInstitution}
                            onChange={(e) => setGroupByInstitution(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                        />
                        <label className="form-check-label small fw-bold text-secondary" htmlFor="groupInstitutionSwitch" style={{ cursor: 'pointer', userSelect: 'none' }}>
                            Group by Institution
                        </label>
                    </div>
                    <div className="d-flex gap-2">
                        <Button
                            color={filterType === 'pending' ? 'primary' : 'light'}
                            onClick={() => setFilterType('pending')}
                            active={filterType === 'pending'}
                        >
                            Pending Requests
                        </Button>
                        <Button
                            color={filterType === 'all' ? 'primary' : 'light'}
                            onClick={() => setFilterType('all')}
                            active={filterType === 'all'}
                        >
                            All Users
                        </Button>
                    </div>
                </div>
            </div>

            <div className="user-list-container">
                {loading ? (
                    <div className="text-center p-5 card border-0 shadow-sm">
                        <Spinner color="primary" />
                        <p className="mt-2 text-muted">Loading users...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center p-5 card border-0 shadow-sm">
                        <div className="display-1 text-muted mb-3"><i className="bi bi-people"></i></div>
                        <p className="lead text-secondary">No {filterType} users found.</p>
                    </div>
                ) : groupByInstitution ? (
                    Object.keys(groupedUsers).sort().map(inst => (
                        <div key={inst} className="mb-4">
                            <h5 className="mb-3 text-secondary fw-bold px-1">{inst}</h5>
                            <Card className="border-0 shadow-sm">
                                <CardBody className="p-0">
                                    {renderUserTable(groupedUsers[inst])}
                                </CardBody>
                            </Card>
                        </div>
                    ))
                ) : (
                    <Card className="border-0 shadow-sm">
                        <CardBody className="p-0">
                            {renderUserTable(sortedUsers)}
                        </CardBody>
                    </Card>
                )}
            </div>

            {/* Edit User Modal */}
            <Modal isOpen={editModalOpen} toggle={() => setEditModalOpen(!editModalOpen)}>
                <ModalHeader toggle={() => setEditModalOpen(!editModalOpen)}>Edit User</ModalHeader>
                <ModalBody>
                    <Form>
                        <FormGroup>
                            <Label for="username">Username</Label>
                            <Input type="text" name="username" id="username" value={editFormData.username} onChange={handleEditChange} />
                        </FormGroup>
                        <FormGroup>
                            <Label for="full_name">Full Name</Label>
                            <Input type="text" name="full_name" id="full_name" value={editFormData.full_name} onChange={handleEditChange} />
                        </FormGroup>
                        <FormGroup>
                            <Label for="email">Email</Label>
                            <Input type="email" name="email" id="email" value={editFormData.email} onChange={handleEditChange} />
                        </FormGroup>
                        <FormGroup>
                            <Label for="department">Department</Label>
                            <Input type="text" name="department" id="department" value={editFormData.department} onChange={handleEditChange} />
                        </FormGroup>
                        <FormGroup>
                            <Label for="institution">Institution</Label>
                            <Input type="text" name="institution" id="institution" value={editFormData.institution} onChange={handleEditChange} />
                        </FormGroup>
                        <FormGroup>
                            <Label for="role">Role</Label>
                            <Input type="select" name="role" id="role" value={editFormData.role} onChange={handleEditChange}>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </Input>
                        </FormGroup>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={handleUpdateUser} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button color="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                </ModalFooter>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={deleteModalOpen} toggle={() => setDeleteModalOpen(!deleteModalOpen)}>
                <ModalHeader toggle={() => setDeleteModalOpen(!deleteModalOpen)}>Confirm Deletion</ModalHeader>
                <ModalBody>
                    Are you sure you want to delete user <strong>{userToDelete?.username}</strong>? This action cannot be undone.
                </ModalBody>
                <ModalFooter>
                    <Button color="danger" onClick={confirmDelete}>Delete User</Button>
                    <Button color="secondary" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

UserManagementTab.propTypes = {
    baseUrl: PropTypes.string.isRequired,
    token: PropTypes.string.isRequired,
};

export default UserManagementTab;
