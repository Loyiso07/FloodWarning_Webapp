import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Alerts({ user }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showResolved, setShowResolved] = useState(false);

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchAlerts = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const response = await axios.get(`http://localhost:5000/api/alerts?resolved=${showResolved}`, { headers });
            setAlerts(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching alerts:', error);
            setLoading(false);
        }
    };

    const resolveAlert = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            await axios.put(`http://localhost:5000/api/alerts/${id}/resolve`, {}, { headers });
            fetchAlerts();
        } catch (error) {
            console.error('Error resolving alert:', error);
        }
    };

    const isAdmin = user?.role === 'admin';

    if (loading) return <div className="loading">Loading alerts...</div>;

    return (
        <div className="page alerts-page">
            <div className="page-header">
                <h1>🔔 Alerts</h1>
                <div className="alert-controls">
                    <label>
                        <input
                            type="checkbox"
                            checked={showResolved}
                            onChange={(e) => {
                                setShowResolved(e.target.checked);
                                fetchAlerts();
                            }}
                        />
                        Show resolved
                    </label>
                    <button className="btn-refresh" onClick={fetchAlerts}>🔄 Refresh</button>
                </div>
            </div>

            {alerts.length === 0 ? (
                <div className="no-alerts">
                    <p>✅ No alerts to display</p>
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
                                    {alert.is_resolved && (
                                        <span className="resolved-badge">✅ Resolved</span>
                                    )}
                                </div>
                            </div>
                            <div className="alert-body">
                                <p>{alert.message}</p>
                                <p className="alert-type">Type: {alert.alert_type}</p>
                            </div>
                            {!alert.is_resolved && isAdmin && (
                                <div className="alert-actions">
                                    <button onClick={() => resolveAlert(alert.id)} className="btn-resolve">
                                        Mark as Resolved
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Alerts;