import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [resetUsername, setResetUsername] = useState('');
    const [resetMessage, setResetMessage] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/login', {
                username,
                password
            });

            const { token, user } = response.data;
            onLogin(token, user);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setResetLoading(true);
        setResetMessage('');

        try {
            const response = await axios.post('http://localhost:5000/api/forgot-password', {
                username: resetUsername
            });
            setResetMessage('Password reset link sent! Check your email.');
            setTimeout(() => {
                setShowForgot(false);
                setResetMessage('');
                setResetUsername('');
            }, 3000);
        } catch (err) {
            setResetMessage(err.response?.data?.error || 'User not found');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h1>🌊 Flood Warning System</h1>
                <h2>{showForgot ? 'Reset Password' : 'Login'}</h2>
                
                {error && <div className="error-message">{error}</div>}
                
                {!showForgot ? (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                placeholder="Enter username"
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Enter password"
                            />
                        </div>
                        <button type="submit" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                        
                        <div className="login-links">
                            <button 
                                type="button" 
                                className="link-btn"
                                onClick={() => setShowForgot(true)}
                            >
                                Forgot Password?
                            </button>
                            <span style={{ margin: '0 8px', color: '#ccc' }}>|</span>
                            <Link to="/register" className="link-btn">
                                Create Account
                            </Link>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleForgotPassword}>
                        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                            Enter your username and we'll send you a password reset link.
                        </p>
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                value={resetUsername}
                                onChange={(e) => setResetUsername(e.target.value)}
                                required
                                placeholder="Enter your username"
                            />
                        </div>
                        {resetMessage && (
                            <div className={resetMessage.includes('sent') ? 'success-message' : 'error-message'}>
                                {resetMessage}
                            </div>
                        )}
                        <button type="submit" disabled={resetLoading}>
                            {resetLoading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                        <button 
                            type="button" 
                            className="link-btn back-btn"
                            onClick={() => {
                                setShowForgot(false);
                                setResetMessage('');
                                setResetUsername('');
                            }}
                        >
                            ← Back to Login
                        </button>
                    </form>
                )}
                
                <div className="login-footer">
                    <p>Admin login: admin / admin123</p>
                    <p style={{ marginTop: '4px', fontSize: '12px', color: '#999' }}>
                        New user? <Link to="/register" style={{ color: '#667eea' }}>Sign up here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;