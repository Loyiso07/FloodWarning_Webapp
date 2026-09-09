import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Readings() {
    const [readings, setReadings] = useState([]);
    const [bridges, setBridges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('timestamp');
    const [sortDirection, setSortDirection] = useState('desc');
    const [selectedBridge, setSelectedBridge] = useState('');
    const [filteredReadings, setFilteredReadings] = useState([]);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        filterAndSortReadings();
    }, [readings, searchTerm, selectedBridge, sortField, sortDirection]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [readingsRes, bridgesRes] = await Promise.all([
                axios.get(`${API_URL}/api/readings?limit=100`, { headers }),
                axios.get(`${API_URL}/api/bridges`, { headers })
            ]);

            setReadings(readingsRes.data);
            setBridges(bridgesRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    const filterAndSortReadings = () => {
        let filtered = [...readings];

        // Filter by bridge
        if (selectedBridge) {
            filtered = filtered.filter(r => r.bridge_id === parseInt(selectedBridge));
        }

        // Filter by search term (bridge name)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(r => 
                r.bridge_name?.toLowerCase().includes(term) ||
                r.bridge_code?.toLowerCase().includes(term)
            );
        }

        // Sort
        filtered.sort((a, b) => {
            let valA, valB;
            
            switch (sortField) {
                case 'timestamp':
                    valA = new Date(a.timestamp);
                    valB = new Date(b.timestamp);
                    break;
                case 'water_level_cm':
                    valA = a.water_level_cm;
                    valB = b.water_level_cm;
                    break;
                case 'vibration_g':
                    valA = a.vibration_g;
                    valB = b.vibration_g;
                    break;
                case 'bridge_name':
                    valA = a.bridge_name || '';
                    valB = b.bridge_name || '';
                    break;
                case 'alert_level':
                    const order = { 'danger': 0, 'warning': 1, 'normal': 2 };
                    valA = order[a.alert_level] || 3;
                    valB = order[b.alert_level] || 3;
                    break;
                default:
                    valA = a.timestamp;
                    valB = b.timestamp;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        setFilteredReadings(filtered);
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (field) => {
        if (sortField !== field) return '↕';
        return sortDirection === 'asc' ? '↑' : '↓';
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedBridge('');
        setSortField('timestamp');
        setSortDirection('desc');
    };

    if (loading) return <div className="loading">Loading readings...</div>;

    const hasFilters = searchTerm || selectedBridge;

    return (
        <div className="page readings-page">
            <div className="page-header">
                <h1>📊 Sensor Readings</h1>
                <span className="reading-count">Total: {filteredReadings.length} readings</span>
            </div>

            {/* Search and Filter Bar */}
            <div className="search-filter-bar">
                <div className="search-group">
                    <input
                        type="text"
                        placeholder="🔍 Search by bridge name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="filter-group">
                    <select
                        value={selectedBridge}
                        onChange={(e) => setSelectedBridge(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">All Bridges</option>
                        {bridges.map(bridge => (
                            <option key={bridge.id} value={bridge.id}>
                                {bridge.name} ({bridge.code})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-actions">
                    {hasFilters && (
                        <button onClick={clearFilters} className="btn-clear">
                            ✕ Clear Filters
                        </button>
                    )}
                    <button onClick={fetchData} className="btn-refresh">
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* Sort Controls */}
            <div className="sort-controls">
                <span className="sort-label">Sort by:</span>
                <button 
                    className={`sort-btn ${sortField === 'timestamp' ? 'active' : ''}`}
                    onClick={() => handleSort('timestamp')}
                >
                    Time {getSortIcon('timestamp')}
                </button>
                <button 
                    className={`sort-btn ${sortField === 'water_level_cm' ? 'active' : ''}`}
                    onClick={() => handleSort('water_level_cm')}
                >
                    Water Level {getSortIcon('water_level_cm')}
                </button>
                <button 
                    className={`sort-btn ${sortField === 'vibration_g' ? 'active' : ''}`}
                    onClick={() => handleSort('vibration_g')}
                >
                    Vibration {getSortIcon('vibration_g')}
                </button>
                <button 
                    className={`sort-btn ${sortField === 'alert_level' ? 'active' : ''}`}
                    onClick={() => handleSort('alert_level')}
                >
                    Status {getSortIcon('alert_level')}
                </button>
                <button 
                    className={`sort-btn ${sortField === 'bridge_name' ? 'active' : ''}`}
                    onClick={() => handleSort('bridge_name')}
                >
                    Bridge {getSortIcon('bridge_name')}
                </button>
            </div>

            {/* Readings Table */}
            <div className="readings-list">
                {filteredReadings.length === 0 ? (
                    <div className="no-data">
                        <p>No readings found</p>
                        {hasFilters && (
                            <button onClick={clearFilters} className="btn-clear">
                                Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Bridge</th>
                                    <th>Water Level</th>
                                    <th>Vibration</th>
                                    <th>Barriers</th>
                                    <th>Buzzer</th>
                                    <th>Status</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReadings.map(reading => (
                                    <tr key={reading.id}>
                                        <td>
                                            <strong>{reading.bridge_name}</strong>
                                            <span className="bridge-code-small">{reading.bridge_code}</span>
                                        </td>
                                        <td>{reading.water_level_cm}cm</td>
                                        <td>{reading.vibration_g}g</td>
                                        <td>
                                            {reading.barrier1_status ? '🔒' : '🔓'}
                                            {reading.barrier2_status ? '🔒' : '🔓'}
                                        </td>
                                        <td>{reading.buzzer_status ? '🔊' : '🔇'}</td>
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
                )}
            </div>
        </div>
    );
}

export default Readings;