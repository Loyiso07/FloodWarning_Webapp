import React, { useState, useEffect } from 'react';
import axios from 'axios';

function CitizenDashboard({ user }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ✅ Use environment variable for API URL
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchAlerts = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            // ✅ Use API_URL variable instead of hardcoded localhost
            const response = await axios.get(`${API_URL}/api/alerts?resolved=false`, { headers });
            
            console.log('📢 User alerts fetched:', response.data.length);
            setAlerts(response.data);
            setLoading(false);
            setError('');
        } catch (error) {
            console.error('Error fetching alerts:', error);
            setError('Failed to load alerts');
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Loading alerts...</div>;

    return (
        <div className="dashboard citizen-dashboard">
            <h1>📢 Public Alerts</h1>
            <p className="subtitle">Stay informed about bridge conditions in your area</p>

            {error && <div className="error-message">{error}</div>}

            <div className="alert-summary">
                <div className="stat-card">
                    <h3>Active Alerts</h3>
                    <div className="stat-value" style={{ color: alerts.length > 0 ? '#e53e3e' : '#48bb78' }}>
                        {alerts.length}
                    </div>
                </div>
                <div className="stat-card">
                    <h3>Status</h3>
                    <div className="stat-value" style={{ fontSize: '20px', color: alerts.length > 0 ? '#e53e3e' : '#48bb78' }}>
                        {alerts.length > 0 ? '⚠️ Alerts Active' : '✅ All Clear'}
                    </div>
                </div>
            </div>

            <div className="recent-readings">
                <h2>Current Alerts</h2>
                {alerts.length === 0 ? (
                    <div className="no-alerts">
                        <p>✅ No active alerts at this time. Stay safe!</p>
                    </div>
                ) : (
                    <div className="alerts-list">
                        {alerts.map(alert => (
                            <div className={`alert-card severity-${alert.severity}`} key={alert.id}>
                                <div className="alert-header">
                                    <div className="alert-title">
                                        <span className="alert-icon">
                                            {alert.severity === 'danger' ? '🚨' : '⚠️'}
                                        </span>
                                        <span className="alert-bridge">{alert.bridge_name}</span>
                                        <span className={`severity-badge ${alert.severity}`}>
                                            {alert.severity}
                                        </span>
                                    </div>
                                    <div className="alert-time">
                                        {new Date(alert.created_at).toLocaleString()}
                                    </div>
                                </div>
                                <div className="alert-body">
                                    <p>{alert.message}</p>
                                    <p className="alert-type">Type: {alert.alert_type}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default CitizenDashboard;