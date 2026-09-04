import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import CreateAdmin from './components/CreateAdmin';
import UserManagement from './components/UserManagement';
import Bridges from './components/Bridges';
import Readings from './components/Readings';
import Alerts from './components/Alerts';
import Help from './components/Help';
import CitizenDashboard from './components/CitizenDashboard';
import './App.css';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (token && userData) {
            const parsedUser = JSON.parse(userData);
            setIsAuthenticated(true);
            setUser(parsedUser);
            setUserRole(parsedUser.role);
        }
    }, []);

    const handleLogin = (token, userData) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setIsAuthenticated(true);
        setUser(userData);
        setUserRole(userData.role);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
        setUserRole(null);
    };

    const isAdmin = userRole === 'admin';

    return (
        <Router>
            <div className="app">
                {isAuthenticated && (
                    <nav className="navbar">
                        <div className="nav-brand">🌊 Flood Warning System</div>
                        <div className="nav-links">
                            <Link to="/dashboard">Dashboard</Link>
                            {isAdmin && (
                                <>
                                    <Link to="/bridges">Bridges</Link>
                                    <Link to="/readings">Readings</Link>
                                    <Link to="/users">Users</Link>
                                    <Link to="/create-admin">+ Admin</Link>
                                </>
                            )}
                            <Link to="/alerts">Alerts</Link>
                            <Link to="/help">Help</Link>
                            <button onClick={handleLogout} className="logout-btn">Logout</button>
                        </div>
                        <div className="user-info">
                            Welcome, {user?.name} ({user?.role})
                        </div>
                    </nav>
                )}
                <Routes>
                    <Route path="/login" element={
                        isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
                    } />
                    <Route path="/register" element={
                        isAuthenticated ? <Navigate to="/dashboard" /> : <Register onLogin={handleLogin} />
                    } />
                    <Route path="/create-admin" element={
                        isAuthenticated && isAdmin ? <CreateAdmin /> : <Navigate to="/dashboard" />
                    } />
                    <Route path="/users" element={
                        isAuthenticated && isAdmin ? <UserManagement /> : <Navigate to="/dashboard" />
                    } />
                    <Route path="/dashboard" element={
                        isAuthenticated ? 
                            (isAdmin ? <Dashboard user={user} /> : <CitizenDashboard user={user} />) : 
                            <Navigate to="/login" />
                    } />
                    <Route path="/bridges" element={
                        isAuthenticated && isAdmin ? <Bridges /> : <Navigate to="/dashboard" />
                    } />
                    <Route path="/readings" element={
                        isAuthenticated && isAdmin ? <Readings /> : <Navigate to="/dashboard" />
                    } />
                    <Route path="/alerts" element={
                        isAuthenticated ? <Alerts user={user} /> : <Navigate to="/login" />
                    } />
                    <Route path="/help" element={
                        isAuthenticated ? <Help user={user} /> : <Navigate to="/login" />
                    } />
                    <Route path="/" element={<Navigate to="/login" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;