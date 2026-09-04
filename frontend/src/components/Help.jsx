import React from 'react';

function Help({ user }) {
    const emergencyContacts = [
        { name: 'National Emergency', number: '10111', description: 'Police, Fire, Ambulance' },
        { name: 'National Disaster Management', number: '0800 000 000', description: 'Disaster Response' },
        { name: 'Ambulance', number: '10177', description: 'Medical Emergency' },
        { name: 'Fire Department', number: '10111', description: 'Fire Emergencies' },
        { name: 'Childline South Africa', number: '116', description: 'Child Helpline' },
        { name: 'Gender-Based Violence Hotline', number: '0800 150 150', description: 'GBV Support' },
        { name: 'Suicide Crisis Line', number: '0800 567 567', description: 'Mental Health Support' },
        { name: 'Poison Information Centre', number: '0861 555 777', description: 'Poison Emergencies' },
    ];

    const floodSafetyTips = [
        '🚨 If you see rising water, move to higher ground immediately.',
        '📻 Listen to local radio for emergency updates.',
        '🚗 Never drive through flooded roads - turn around, don\'t drown!',
        '⚡ Stay away from power lines and electrical equipment.',
        '📱 Keep your phone charged for emergency calls.',
        '🏠 Prepare an emergency kit with food, water, and medicines.',
        '👨‍👩‍👧‍👦 Check on neighbours, especially elderly and children.',
    ];

    return (
        <div className="help-page">
            <div className="help-header">
                <h1>🆘 Emergency Help & Contacts</h1>
                <p>Your safety is our priority. Here are resources to help you stay safe.</p>
            </div>

            <div className="help-grid">
                {/* Emergency Contacts */}
                <div className="help-section emergency-section">
                    <h2>📞 Emergency Contacts</h2>
                    <div className="contacts-grid">
                        {emergencyContacts.map((contact, index) => (
                            <div className="contact-card" key={index}>
                                <h3>{contact.name}</h3>
                                <div className="phone-number">
                                    <span className="phone-icon">📞</span>
                                    <a href={`tel:${contact.number}`}>{contact.number}</a>
                                </div>
                                <p className="contact-description">{contact.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Flood Safety Tips */}
                <div className="help-section safety-section">
                    <h2>🌊 Flood Safety Tips</h2>
                    <div className="safety-grid">
                        {floodSafetyTips.map((tip, index) => (
                            <div className="safety-tip" key={index}>
                                <span className="tip-number">{index + 1}</span>
                                <p>{tip}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="help-section quick-actions">
                    <h2>⚡ Quick Actions</h2>
                    <div className="action-grid">
                        <a href="tel:10111" className="action-btn emergency">
                            <span className="action-icon">🚨</span>
                            Call Emergency
                        </a>
                        <a href="sms:10111" className="action-btn sms">
                            <span className="action-icon">✉️</span>
                            SMS Emergency
                        </a>
                        <a href="https://www.weathersa.co.za/" target="_blank" rel="noopener noreferrer" className="action-btn weather">
                            <span className="action-icon">🌤️</span>
                            Weather Update
                        </a>
                        <button onClick={() => window.location.href = '/alerts'} className="action-btn alerts">
                            <span className="action-icon">🔔</span>
                            View Alerts
                        </button>
                    </div>
                </div>
            </div>

            {user?.role === 'admin' && (
                <div className="admin-note">
                    <p>🔐 You have admin privileges. You can manage bridges and readings.</p>
                </div>
            )}
        </div>
    );
}

export default Help;