import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Alerts({ user }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showResolved, setShowResolved] = useState(false);
    const [selectedAlerts, setSelectedAlerts] = useState([]);
    const [isBulkResolving, setIsBulkResolving] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 30000);
        return () => clearInterval(interval);
    }, [showResolved]);

    const fetchAlerts = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const response = await axios.get(`${API_URL}/api/alerts?resolved=${showResolved}`, { headers });
            setAlerts(response.data);
            setLoading(false);
            // Clear selections when fetching new data
            setSelectedAlerts([]);
        } catch (error) {
            console.error('Error fetching alerts:', error);
            setLoading(false);
        }
    };

    const resolveAlert = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            await axios.put(`${API_URL}/api/alerts/${id}/resolve`, {}, { headers });
            fetchAlerts();
        } catch (error) {
            console.error('Error resolving alert:', error);
        }
    };

    const handleSelectAll = () => {
        // Get all unresolved alert IDs
        const unresolvedAlerts = alerts.filter(alert => !alert.is_resolved);
        const allIds = unresolvedAlerts.map(alert => alert.id);
        
        // If all are already selected, deselect all
        if (selectedAlerts.length === allIds.length && allIds.length > 0) {
            setSelectedAlerts([]);
        } else {
            setSelectedAlerts(allIds);
        }
    };

    const handleSelectOne = (id) => {
        setSelectedAlerts(prev => {
            if (prev.includes(id)) {
                return prev.filter(alertId => alertId !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleResolveSelected = async () => {
        if (selectedAlerts.length === 0) {
            alert('Please select at least one alert to resolve.');
            return;
        }

        if (!window.confirm(`Are you sure you want to mark ${selectedAlerts.length} alert(s) as resolved?`)) {
            return;
        }

        setIsBulkResolving(true);

        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // Resolve all selected alerts
            await Promise.all(
                selectedAlerts.map(id => 
                    axios.put(`${API_URL}/api/alerts/${id}/resolve`, {}, { headers })
                )
            );

            setSelectedAlerts([]);
            fetchAlerts();
            alert(`✅ ${selectedAlerts.length} alert(s) resolved successfully!`);
        } catch (error) {
            console.error('Error resolving alerts:', error);
            alert('❌ Failed to resolve some alerts. Please try again.');
        } finally {
            setIsBulkResolving(false);
        }
    };

    const isAdmin = user?.role === 'admin';
    const unresolvedAlerts = alerts.filter(alert => !alert.is_resolved);
    const allSelected = unresolvedAlerts.length > 0 && 
                        selectedAlerts.length === unresolvedAlerts.length;

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
                                setSelectedAlerts([]);
                            }}
                        />
                        Show resolved
                    </label>
                    <button className="btn-refresh" onClick={fetchAlerts}>🔄 Refresh</button>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {isAdmin && unresolvedAlerts.length > 0 && (
                <div className="bulk-actions-bar">
                    <div className="bulk-actions-left">
                        <label className="select-all-label">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={handleSelectAll}
                            />
                            Select All ({unresolvedAlerts.length})
                        </label>
                        <span className="selected-count">
                            {selectedAlerts.length} selected
                        </span>
                    </div>
                    <div className="bulk-actions-right">
                        <button
                            className="btn-resolve-all"
                            onClick={handleResolveSelected}
                            disabled={selectedAlerts.length === 0 || isBulkResolving}
                        >
                            {isBulkResolving ? 'Resolving...' : `✅ Mark ${selectedAlerts.length} as Resolved`}
                        </button>
                    </div>
                </div>
            )}

            {alerts.length === 0 ? (
                <div className="no-alerts">
                    <p>✅ No alerts to display</p>
                </div>
            ) : (
                <div className="alerts-list">
                    {alerts.map(alert => {
                        const isUnresolved = !alert.is_resolved;
                        const isSelected = selectedAlerts.includes(alert.id);
                        const showCheckbox = isAdmin && isUnresolved;

                        return (
                            <div 
                                className={`alert-card severity-${alert.severity} ${isSelected ? 'selected' : ''}`} 
                                key={alert.id}
                            >
                                <div className="alert-header">
                                    <div className="alert-title">
                                        {showCheckbox && (
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleSelectOne(alert.id)}
                                                className="alert-checkbox"
                                            />
                                        )}
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
                                {isUnresolved && isAdmin && (
                                    <div className="alert-actions">
                                        <button 
                                            onClick={() => resolveAlert(alert.id)} 
                                            className="btn-resolve"
                                        >
                                            Mark as Resolved
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default Alerts;