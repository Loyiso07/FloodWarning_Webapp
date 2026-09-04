import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Readings() {
    const [readings, setReadings] = useState([]);
    const [bridges, setBridges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        bridge_id: '',
        water_level_cm: '',
        vibration_g: '',
        barrier1_status: false,
        barrier2_status: false,
        buzzer_status: false
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [readingsRes, bridgesRes] = await Promise.all([
                axios.get('http://localhost:5000/api/readings?limit=20', { headers }),
                axios.get('http://localhost:5000/api/bridges', { headers })
            ]);

            setReadings(readingsRes.data);
            setBridges(bridgesRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            await axios.post('http://localhost:5000/api/readings', {
                ...formData,
                water_level_cm: parseFloat(formData.water_level_cm),
                vibration_g: parseFloat(formData.vibration_g),
                barrier1_status: formData.barrier1_status,
                barrier2_status: formData.barrier2_status,
                buzzer_status: formData.buzzer_status
            }, { headers });

            setSuccess('Reading added successfully!');
            setFormData({
                bridge_id: '',
                water_level_cm: '',
                vibration_g: '',
                barrier1_status: false,
                barrier2_status: false,
                buzzer_status: false
            });
            fetchData();

            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to add reading');
        }
    };

    if (loading) return <div className="loading">Loading readings...</div>;

    return (
        <div className="page readings-page">
            <div className="page-header">
                <h1>📊 Sensor Readings</h1>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {/* Add Reading Form */}
            <div className="form-container">
                <h2>Add New Reading</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Bridge</label>
                            <select
                                value={formData.bridge_id}
                                onChange={(e) => setFormData({ ...formData, bridge_id: e.target.value })}
                                required
                            >
                                <option value="">Select a bridge</option>
                                {bridges.map(bridge => (
                                    <option key={bridge.id} value={bridge.id}>
                                        {bridge.name} ({bridge.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Water Level (cm)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.water_level_cm}
                                onChange={(e) => setFormData({ ...formData, water_level_cm: e.target.value })}
                                required
                                placeholder="e.g., 12.5"
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Vibration (g)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.vibration_g}
                                onChange={(e) => setFormData({ ...formData, vibration_g: e.target.value })}
                                required
                                placeholder="e.g., 1.2"
                            />
                        </div>
                        <div className="form-group checkbox-group">
                            <label>Controls</label>
                            <div className="checkbox-row">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.barrier1_status}
                                        onChange={(e) => setFormData({ ...formData, barrier1_status: e.target.checked })}
                                    />
                                    Barrier 1
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.barrier2_status}
                                        onChange={(e) => setFormData({ ...formData, barrier2_status: e.target.checked })}
                                    />
                                    Barrier 2
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.buzzer_status}
                                        onChange={(e) => setFormData({ ...formData, buzzer_status: e.target.checked })}
                                    />
                                    Buzzer
                                </label>
                            </div>
                        </div>
                    </div>
                    <button type="submit" className="btn-success">Add Reading</button>
                </form>
            </div>

            {/* Readings List */}
            <div className="readings-list">
                <h2>Recent Readings ({readings.length})</h2>
                {readings.length === 0 ? (
                    <p className="no-data">No readings yet.</p>
                ) : (
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
                            {readings.map(reading => (
                                <tr key={reading.id}>
                                    <td>{reading.bridge_name}</td>
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
                )}
            </div>
        </div>
    );
}

export default Readings;