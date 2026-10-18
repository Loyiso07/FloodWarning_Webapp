import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Override() {
    const [bridgeId, setBridgeId] = useState(1);
    const [bridges, setBridges] = useState([]);
    const [controls, setControls] = useState({
        barrier_override: false,
        buzzer_override: false
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        // Fetch bridges and current control state
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            try {
                const bridgesRes = await axios.get(`${API_URL}/api/bridges`, { headers });
                setBridges(bridgesRes.data);
                
                const controlRes = await axios.get(`${API_URL}/api/controls/${bridgeId}`, { headers });
                setControls(controlRes.data);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, [bridgeId, API_URL]);

    const handleToggle = async (field) => {
        setLoading(true);
        setMessage('');
        const newControls = { ...controls, [field]: !controls[field] };
        
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            await axios.post(`${API_URL}/api/controls/${bridgeId}`, newControls, { headers });
            setControls(newControls);
            setMessage('✅ Command sent to bridge!');
        } catch (error) {
            console.error("Error sending command:", error);
            setMessage('❌ Failed to send command.');
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    return (
        <div className="page override-page">
            <div className="page-header">
                <h1>⚠️ Manual System Override</h1>
                <p style={{ color: '#666', marginTop: '8px' }}>
                    Use this panel only if the automatic sensors are malfunctioning.
                </p>
            </div>

            <div className="form-container">
                <div className="form-group">
                    <label>Select Bridge</label>
                    <select 
                        value={bridgeId} 
                        onChange={(e) => setBridgeId(e.target.value)}
                    >
                        {bridges.map(b => (
                            <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                        ))}
                    </select>
                </div>

                {message && <div className={message.includes('✅') ? 'success-message' : 'error-message'}>{message}</div>}

                <div className="override-controls" style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                    
                    {/* Barrier Control */}
                    <div className="override-card" style={{ flex: 1, padding: '20px', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
                        <h2>Barrier Gate</h2>
                        <p style={{ margin: '10px 0', fontSize: '24px' }}>
                            {controls.barrier_override ? '🔒 CLOSED (Forced)' : '🔓 OPEN (Normal)'}
                        </p>
                        <button 
                            className={`btn-${controls.barrier_override ? 'delete' : 'primary'}`}
                            onClick={() => handleToggle('barrier_override')}
                            disabled={loading}
                            style={{ width: '100%', padding: '12px' }}
                        >
                            {controls.barrier_override ? 'Force Open' : 'Force Close'}
                        </button>
                    </div>

                    {/* Buzzer Control */}
                    <div className="override-card" style={{ flex: 1, padding: '20px', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
                        <h2>Alarm Buzzer</h2>
                        <p style={{ margin: '10px 0', fontSize: '24px' }}>
                            {controls.buzzer_override ? '🔊 ON (Forced)' : '🔇 OFF (Normal)'}
                        </p>
                        <button 
                            className={`btn-${controls.buzzer_override ? 'delete' : 'primary'}`}
                            onClick={() => handleToggle('buzzer_override')}
                            disabled={loading}
                            style={{ width: '100%', padding: '12px' }}
                        >
                            {controls.buzzer_override ? 'Turn Buzzer Off' : 'Sound Buzzer'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default Override;