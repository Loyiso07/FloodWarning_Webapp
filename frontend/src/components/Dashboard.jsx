import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard({ user }) {
    const [stats, setStats] = useState(null);
    const [readings, setReadings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const statsRes = await axios.get('http://localhost:5000/api/stats', { headers });
            const readingsRes = await axios.get('http://localhost:5000/api/readings?limit=10', { headers });

            setStats(statsRes.data);
            setReadings(readingsRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    if (loading) return <div className="loading">Loading dashboard...</div>;

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
            </div>
        </div>
    );
}

export default Dashboard;