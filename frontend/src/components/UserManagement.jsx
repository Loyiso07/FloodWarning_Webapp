import React, { useState, useEffect } from 'react';
import axios from 'axios';

function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ✅ Use environment variable for API URL
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            console.log('Token:', token);
            
            if (!token) {
                setError('No authentication token found. Please login again.');
                setLoading(false);
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };
            const response = await axios.get(`${API_URL}/api/users`, { headers });
            
            console.log('Users response:', response.data);
            setUsers(response.data);
            setLoading(false);
            setError('');
        } catch (error) {
            console.error('Error fetching users:', error);
            console.error('Error response:', error.response?.data);
            
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setError('Session expired. Please login again.');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else if (error.response?.status === 403) {
                setError('Access denied. Admin privileges required.');
            } else if (error.code === 'ERR_NETWORK') {
                setError('Cannot connect to server. Make sure backend is running.');
            } else {
                setError(error.response?.data?.error || 'Failed to fetch users');
            }
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Loading users...</div>;

    if (error) return (
        <div className="page users-page">
            <h1>👥 User Management</h1>
            <div className="error-message" style={{ 
                background: '#fed7d7', 
                color: '#c53030', 
                padding: '20px', 
                borderRadius: '8px',
                margin: '20px 0'
            }}>
                <p><strong>Error:</strong> {error}</p>
                <button 
                    onClick={fetchUsers} 
                    style={{ 
                        marginTop: '10px', 
                        padding: '8px 20px', 
                        background: '#667eea', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '5px', 
                        cursor: 'pointer' 
                    }}
                >
                    Retry
                </button>
            </div>
        </div>
    );

    return (
        <div className="page users-page">
            <div className="page-header">
                <h1>👥 User Management</h1>
                <span className="user-count">Total: {users.length} users</span>
            </div>

            <div className="users-table-container">
                {users.length === 0 ? (
                    <div className="no-data">No users found</div>
                ) : (
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Username</th>
                                <th>Phone</th>
                                <th>Role</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.name} {user.surname}</td>
                                    <td><strong>{user.username}</strong></td>
                                    <td>{user.phone_number || '-'}</td>
                                    <td>
                                        <span className={`role-badge ${user.role}`}>
                                            {user.role === 'admin' ? '👑 Admin' : '👤 Citizen'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default UserManagement;