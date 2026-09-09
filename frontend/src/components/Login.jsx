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
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/login`, {
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
            const response = await axios.post(`${API_URL}/api/forgot-password`, {
                username: resetUsername
            });
            
            // Show the reset token to the user (since no email)
            setResetMessage(`✅ Password reset link generated! Your reset token: ${response.data.resetToken}`);
            
            // Auto-fill the token field and switch to reset mode after 2 seconds
            setTimeout(() => {
                setResetToken(response.data.resetToken);
                setShowResetPassword(true);
                setShowForgot(false);
                setResetMessage('');
            }, 2000);
            
        } catch (err) {
            setResetMessage(err.response?.data?.error || 'User not found');
        } finally {
            setResetLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setResetMessage('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setResetLoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/reset-password`, {
                token: resetToken,
                newPassword: newPassword
            });

            setResetMessage('✅ Password reset successfully! You can now login.');
            setTimeout(() => {
                setShowResetPassword(false);
                setShowForgot(false);
                setResetMessage('');
                setResetToken('');
                setNewPassword('');
                setConfirmPassword('');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h1>🌊 Flood Warning System</h1>
                <h2>
                    {showResetPassword ? 'Reset Password' : 
                     showForgot ? 'Forgot Password' : 'Login'}
                </h2>
                
                {error && <div className="error-message">{error}</div>}
                {resetMessage && (
                    <div className={resetMessage.includes('✅') ? 'success-message' : 'error-message'}>
                        {resetMessage}
                    </div>
                )}
                
                {/* Login Form */}
                {!showForgot && !showResetPassword && (
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
                )}

                {/* Forgot Password Form */}
                {showForgot && !showResetPassword && (
                    <form onSubmit={handleForgotPassword}>
                        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                            Enter your username to receive a password reset token.
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
                        <button type="submit" disabled={resetLoading}>
                            {resetLoading ? 'Generating...' : 'Get Reset Token'}
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

                {/* Reset Password Form */}
                {showResetPassword && (
                    <form onSubmit={handleResetPassword}>
                        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                            Enter the reset token and your new password.
                        </p>
                        <div className="form-group">
                            <label>Reset Token</label>
                            <input
                                type="text"
                                value={resetToken}
                                onChange={(e) => setResetToken(e.target.value)}
                                required
                                placeholder="Paste your reset token here"
                            />
                        </div>
                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                placeholder="Min 6 characters"
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Confirm new password"
                            />
                        </div>
                        <button type="submit" disabled={resetLoading}>
                            {resetLoading ? 'Resetting...' : 'Reset Password'}
                        </button>
                        <button 
                            type="button" 
                            className="link-btn back-btn"
                            onClick={() => {
                                setShowResetPassword(false);
                                setShowForgot(false);
                                setResetMessage('');
                                setResetToken('');
                                setNewPassword('');
                                setConfirmPassword('');
                            }}
                        >
                            ← Back to Login
                        </button>
                    </form>
                )}
                
                <div className="login-footer">
                    <p style={{ color: '#999', fontSize: '13px' }}>
                        Need help? Contact your system administrator.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;