import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard({ user }) {
    const [stats, setStats] = useState(null);
    const [readings, setReadings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            console.log('Token:', token); // Debug: Check if token exists
            
            if (!token) {
                setError('No authentication token found. Please login again.');
                setLoading(false);
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };
            
            console.log('Fetching stats...');
            const statsRes = await axios.get('/api/stats', { headers });
            console.log('Stats response:', statsRes.data);
            
            console.log('Fetching readings...');
            const readingsRes = await axios.get('/api/readings?limit=10', { headers });
            console.log('Readings response:', readingsRes.data);

            setStats(statsRes.data);
            setReadings(readingsRes.data);
            setLoading(false);
            setError(null);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            console.error('Error details:', error.response?.data || error.message);
            
            if (error.response?.status === 401) {
                setError('Session expired. Please login again.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            } else if (error.code === 'ERR_NETWORK') {
                setError('Cannot connect to server. Make sure backend is running on port 5000.');
            } else {
                setError(`Failed to load dashboard: ${error.response?.data?.error || error.message}`);
            }
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Loading dashboard...</div>;

    if (error) return (
        <div className="dashboard">
            <h1>Dashboard</h1>
            <div style={{ 
                background: '#fed7d7', 
                color: '#c53030', 
                padding: '20px', 
                borderRadius: '8px',
                margin: '20px 0'
            }}>
                <h3>⚠️ Error</h3>
                <p>{error}</p>
                <button 
                    onClick={fetchDashboardData} 
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
        <div className="dashboard">
            <h1>Dashboard</h1>

            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Total Bridges</h3>
                    <div className="stat-value">{stats?.total_bridges || 0}</div>
                </div>
                <div className="stat-card">
                    <h3>Total Readings</h3>
                    <div className="stat-value">{stats?.total_readings || 0}</div>
                </div>
                <div className="stat-card alert">
                    <h3>Active Alerts</h3>
                    <div className="stat-value">{stats?.active_alerts || 0}</div>
                </div>
                <div className="stat-card danger">
                    <h3>Danger Alerts</h3>
                    <div className="stat-value">{stats?.danger_alerts || 0}</div>
                </div>
            </div>

            <div className="recent-readings">
                <h2>Recent Readings</h2>
                {readings.length === 0 ? (
                    <p style={{ color: '#666', padding: '20px', textAlign: 'center' }}>
                        No readings yet. Add some data!
                    </p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Bridge</th>
                                <th>Water Level</th>
                                <th>Vibration</th>
                                <th>Status</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {readings.map(reading => (
                                <tr key={reading.id}>
                                    <td>{reading.bridge_name}</td>
                                    <td>{reading.water_level_cm}cm</td>
                                    <td>{reading.vibration_g}g</td>
                                    <td>
                                        <span className={`status-${reading.alert_level}`}>
                                            {reading.alert_level}
                                        </span>
                                    </td>
                                    <td>{new Date(reading.timestamp).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default Dashboard;