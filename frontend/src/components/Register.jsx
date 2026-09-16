import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Register({ onLogin }) {
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

    // ✅ Use environment variable for API URL
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        // Validate password length
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/api/register`, {
                name: formData.name,
                surname: formData.surname,
                username: formData.username,
                password: formData.password,
                phone_number: formData.phone_number
            }, {
                timeout: 90000  // ✅ 90 second timeout for Render cold start
            });

            setSuccess('✅ Registration successful! Logging you in...');
            
            // Auto-login after registration
            const { token, user } = response.data;
            setTimeout(() => {
                onLogin(token, user);
            }, 1500);
            
        } catch (err) {
            console.error('Registration error:', err);
            console.error('Error response:', err.response?.data);
            console.error('Error status:', err.response?.status);
            
            let errorMessage = 'Registration failed. Please try again.';
            
            // ✅ Better error messages
            if (err.code === 'ERR_NETWORK' || err.message === 'Network Error' || !err.response) {
                errorMessage = '🌐 Cannot connect to server. The server may be waking up (this takes ~30 seconds). Please wait and try again.';
            } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
                errorMessage = '⏰ Request timed out. Server is starting up. Please wait 30 seconds and try again.';
            } else if (err.response?.status === 400) {
                // Handle "Username already exists" specifically
                errorMessage = err.response.data.error || '❌ Invalid registration data';
            } else if (err.response?.status === 409) {
                errorMessage = '❌ Username already exists. Please choose a different one.';
            } else if (err.response?.status === 500) {
                errorMessage = '⚠️ Server error. Please try again in a moment.';
            } else if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h1>🌊 Flood Warning System</h1>
                <h2>Create Account</h2>
                
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
                
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
                                placeholder="Confirm your password"
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
                    
                    <button type="submit" disabled={loading}>
                        {loading ? '⏳ Creating Account...' : 'Sign Up'}
                    </button>
                    
                    {/* ✅ Helpful hint when loading takes time */}
                    {loading && (
                        <p style={{ 
                            textAlign: 'center', 
                            fontSize: '12px', 
                            color: '#666', 
                            marginTop: '10px' 
                        }}>
                            Server may be waking up. This can take up to 60 seconds on first request.
                        </p>
                    )}
                </form>
                
                <div className="login-footer">
                    <p>Already have an account? <Link to="/login" className="link-btn">Login</Link></p>
                    <p style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
                        By signing up, you agree to our Terms of Service
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Register;