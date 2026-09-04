import React, { useState } from 'react';
import axios from 'axios';

function CreateAdmin() {
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        username: '',
        password: '',
        confirmPassword: '',
        phone_number: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                setError('No authentication token found. Please login again.');
                setLoading(false);
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };

            // ✅ Use the CORRECT endpoint - /api/users with role: 'admin'
            const response = await axios.post(
                'http://localhost:5000/api/users',
                {
                    name: formData.name,
                    surname: formData.surname,
                    username: formData.username,
                    password: formData.password,
                    phone_number: formData.phone_number,
                    role: 'admin'  // ✅ Specify role as admin
                },
                { headers }
            );

            setSuccess(`✅ Admin user "${formData.username}" created successfully!`);
            setFormData({
                name: '',
                surname: '',
                username: '',
                password: '',
                confirmPassword: '',
                phone_number: ''
            });
            
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            console.error('Create admin error:', err);
            setError(err.response?.data?.error || 'Failed to create admin');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page create-admin-page">
            <h1>👑 Create New Admin</h1>
            <p className="subtitle">Add a new administrator to the system</p>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-container">
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>First Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="Enter first name"
                            />
                        </div>
                        <div className="form-group">
                            <label>Last Name *</label>
                            <input
                                type="text"
                                name="surname"
                                value={formData.surname}
                                onChange={handleChange}
                                required
                                placeholder="Enter last name"
                            />
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label>Username *</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            placeholder="Choose a username"
                        />
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label>Password *</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Min 6 characters"
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirm Password *</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                placeholder="Confirm password"
                            />
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input
                            type="tel"
                            name="phone_number"
                            value={formData.phone_number}
                            onChange={handleChange}
                            placeholder="e.g., +27000000000"
                        />
                    </div>
                    
                    <button type="submit" className="btn-success" disabled={loading}>
                        {loading ? 'Creating...' : '👑 Create Admin'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default CreateAdmin;