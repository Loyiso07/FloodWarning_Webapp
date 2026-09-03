import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Bridges from './components/Bridges';
import Readings from './components/Readings';
import Alerts from './components/Alerts';
import './App.css';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (token && userData) {
            setIsAuthenticated(true);
            setUser(JSON.parse(userData));
        }
    }, []);

    const handleLogin = (token, userData) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setIsAuthenticated(true);
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
    };

    return (
        <Router>
            <div className="app">
                {isAuthenticated && (
                    <nav className="navbar">
                        <div className="nav-brand">🌊 Flood Warning System</div>
                        <div className="nav-links">
                            <a href="/dashboard">Dashboard</a>
                            <a href="/bridges">Bridges</a>
                            <a href="/readings">Readings</a>
                            <a href="/alerts">Alerts</a>
                            <button onClick={handleLogout} className="logout-btn">Logout</button>
                        </div>
                        <div className="user-info">Welcome, {user?.name}</div>
                    </nav>
                )}
                <Routes>
                    <Route path="/login" element={
                        isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
                    } />
                    <Route path="/dashboard" element={
                        isAuthenticated ? <Dashboard user={user} /> : <Navigate to="/login" />
                    } />
                    <Route path="/bridges" element={
                        isAuthenticated ? <Bridges /> : <Navigate to="/login" />
                    } />
                    <Route path="/readings" element={
                        isAuthenticated ? <Readings /> : <Navigate to="/login" />
                    } />
                    <Route path="/alerts" element={
                        isAuthenticated ? <Alerts /> : <Navigate to="/login" />
                    } />
                    <Route path="/" element={<Navigate to="/login" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;