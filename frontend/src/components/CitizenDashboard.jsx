import React, { useState, useEffect } from 'react';
import axios from 'axios';

function CitizenDashboard({ user }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchAlerts = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const response = await axios.get('http://localhost:5000/api/alerts?resolved=false', { headers });
            setAlerts(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching alerts:', error);
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Loading alerts...</div>;

    return (
        <div className="dashboard citizen-dashboard">
            <h1>📢 Public Alerts</h1>
            <p className="subtitle">Stay informed about bridge conditions in your area</p>

            <div className="alert-summary">
                <div className="stat-card danger">
                    <h3>Active Alerts</h3>
                    <div className="stat-value">{alerts.length}</div>
                </div>
                <div className="stat-card warning">
                    <h3>Status</h3>
                    <div className="stat-value" style={{ fontSize: '20px' }}>
                        {alerts.length > 0 ? '⚠️ Caution' : '✅ All Clear'}
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
                    <table>
                        <thead>
                            <tr>
                                <th>Bridge</th>
                                <th>Alert Type</th>
                                <th>Message</th>
                                <th>Severity</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alerts.map(alert => (
                                <tr key={alert.id}>
                                    <td>{alert.bridge_name}</td>
                                    <td>{alert.alert_type}</td>
                                    <td>{alert.message}</td>
                                    <td>
                                        <span className={`status-${alert.severity}`}>
                                            {alert.severity}
                                        </span>
                                    </td>
                                    <td>{new Date(alert.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default CitizenDashboard;