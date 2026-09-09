import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Bridges() {
    const [bridges, setBridges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingBridge, setEditingBridge] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        location: '',
        warning_threshold_cm: '',
        danger_threshold_cm: '',
        vibration_threshold_g: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // ✅ Use environment variable for API URL
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchBridges();
    }, []);

    const fetchBridges = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const response = await axios.get(`${API_URL}/api/bridges`, { headers });
            setBridges(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching bridges:', error);
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

            if (editingBridge) {
                await axios.put(`${API_URL}/api/bridges/${editingBridge.id}`, formData, { headers });
                setSuccess('Bridge updated successfully!');
            } else {
                await axios.post(`${API_URL}/api/bridges`, formData, { headers });
                setSuccess('Bridge added successfully!');
            }

            setFormData({
                code: '',
                name: '',
                location: '',
                warning_threshold_cm: '',
                danger_threshold_cm: '',
                vibration_threshold_g: ''
            });
            setShowForm(false);
            setEditingBridge(null);
            fetchBridges();

            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to save bridge');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this bridge?')) return;

        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            await axios.delete(`${API_URL}/api/bridges/${id}`, { headers });
            fetchBridges();
            setSuccess('Bridge deleted successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to delete bridge');
        }
    };

    const handleEdit = (bridge) => {
        setEditingBridge(bridge);
        setFormData({
            code: bridge.code,
            name: bridge.name,
            location: bridge.location,
            warning_threshold_cm: bridge.warning_threshold_cm,
            danger_threshold_cm: bridge.danger_threshold_cm,
            vibration_threshold_g: bridge.vibration_threshold_g
        });
        setShowForm(true);
    };

    if (loading) return <div className="loading">Loading bridges...</div>;

    return (
        <div className="page bridges-page">
            <div className="page-header">
                <h1>🌉 Bridge Management</h1>
                <button className="btn-primary" onClick={() => {
                    setEditingBridge(null);
                    setFormData({
                        code: '',
                        name: '',
                        location: '',
                        warning_threshold_cm: '',
                        danger_threshold_cm: '',
                        vibration_threshold_g: ''
                    });
                    setShowForm(!showForm);
                }}>
                    {showForm ? 'Cancel' : '+ Add Bridge'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {showForm && (
                <div className="form-container">
                    <h2>{editingBridge ? 'Edit Bridge' : 'Add New Bridge'}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Bridge Code</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    required
                                    placeholder="e.g., BR001"
                                />
                            </div>
                            <div className="form-group">
                                <label>Bridge Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="e.g., Main Bridge"
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    required
                                    placeholder="e.g., Cape Town, SA"
                                />
                            </div>
                            <div className="form-group">
                                <label>Vibration Threshold (g)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.vibration_threshold_g}
                                    onChange={(e) => setFormData({ ...formData, vibration_threshold_g: e.target.value })}
                                    required
                                    placeholder="e.g., 2.5"
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Warning Threshold (cm)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.warning_threshold_cm}
                                    onChange={(e) => setFormData({ ...formData, warning_threshold_cm: e.target.value })}
                                    required
                                    placeholder="e.g., 15.0"
                                />
                            </div>
                            <div className="form-group">
                                <label>Danger Threshold (cm)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.danger_threshold_cm}
                                    onChange={(e) => setFormData({ ...formData, danger_threshold_cm: e.target.value })}
                                    required
                                    placeholder="e.g., 25.0"
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn-success">
                            {editingBridge ? 'Update Bridge' : 'Add Bridge'}
                        </button>
                    </form>
                </div>
            )}

            <div className="bridge-list">
                <h2>Bridges ({bridges.length})</h2>
                {bridges.length === 0 ? (
                    <p className="no-data">No bridges added yet. Click "Add Bridge" to get started.</p>
                ) : (
                    <div className="bridge-grid">
                        {bridges.map(bridge => (
                            <div className="bridge-card" key={bridge.id}>
                                <div className="bridge-header">
                                    <h3>{bridge.name}</h3>
                                    <span className="bridge-code">{bridge.code}</span>
                                </div>
                                <div className="bridge-details">
                                    <p><strong>📍 Location:</strong> {bridge.location}</p>
                                    <p><strong>⚠️ Warning:</strong> {bridge.warning_threshold_cm}cm</p>
                                    <p><strong>🚨 Danger:</strong> {bridge.danger_threshold_cm}cm</p>
                                    <p><strong>📊 Vibration:</strong> {bridge.vibration_threshold_g}g</p>
                                </div>
                                <div className="bridge-actions">
                                    <button className="btn-edit" onClick={() => handleEdit(bridge)}>✏️ Edit</button>
                                    <button className="btn-delete" onClick={() => handleDelete(bridge.id)}>🗑️ Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Bridges;