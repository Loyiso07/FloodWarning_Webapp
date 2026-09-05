const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ========== CORS CONFIGURATION ==========
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5000',
    'https://flood-warning-webapp.vercel.app',
    'https://floodwarning-webapp.vercel.app',
    'https://flood-warning-backend.onrender.com'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            console.warn('❌ CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ========== DATABASE CONNECTION ==========
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
    } else {
        console.log('✅ Database connected successfully!');
        console.log('📅 Server time:', res.rows[0].now);
    }
});

// ========== JWT SECRET ==========
const JWT_SECRET = process.env.JWT_SECRET || 'floodwarning_super_secret_key_2026';
console.log('🔑 JWT_SECRET:', JWT_SECRET);

// ========== AUTHENTICATION ==========

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                surname: user.surname,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== GET ALL USERS (ADMIN ONLY) ==========

app.get('/api/users', async (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Invalid token format' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ Decoded token:', decoded);
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }
        
        const result = await pool.query(
            'SELECT id, name, surname, username, phone_number, role FROM users ORDER BY id'
        );
        console.log('✅ Users found:', result.rows.length);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Token verification error:', error.message);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// ========== CREATE USER (ADMIN ONLY) ==========

app.post('/api/users', async (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Invalid token format' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }
        
        const { name, surname, username, password, phone_number, role } = req.body;
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            `INSERT INTO users (name, surname, username, password_hash, phone_number, role) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, surname, username, phone_number, role`,
            [name, surname, username, hashedPassword, phone_number, role || 'staff']
        );
        
        console.log('✅ User created:', result.rows[0].username);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error creating user:', error.message);
        if (error.code === '23505') {
            res.status(400).json({ error: 'Username already exists' });
        } else {
            res.status(500).json({ error: 'Server error' });
        }
    }
});

// ========== USER REGISTRATION ==========

app.post('/api/register', async (req, res) => {
    const { name, surname, username, password, phone_number } = req.body;
    
    try {
        const existing = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            `INSERT INTO users (name, surname, username, password_hash, phone_number, role) 
             VALUES ($1, $2, $3, $4, $5, 'staff') RETURNING id, name, surname, username, phone_number, role`,
            [name, surname, username, hashedPassword, phone_number]
        );
        
        const token = jwt.sign(
            { userId: result.rows[0].id, username: result.rows[0].username, role: result.rows[0].role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.status(201).json({
            message: 'Registration successful!',
            token,
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== BRIDGE ENDPOINTS ==========

app.get('/api/bridges', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM bridges ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching bridges:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/bridges', async (req, res) => {
    const { code, name, location, warning_threshold_cm, danger_threshold_cm, vibration_threshold_g } = req.body;
    
    try {
        const result = await pool.query(
            `INSERT INTO bridges (code, name, location, warning_threshold_cm, danger_threshold_cm, vibration_threshold_g) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [code, name, location, warning_threshold_cm, danger_threshold_cm, vibration_threshold_g]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating bridge:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/bridges/:id', async (req, res) => {
    const { id } = req.params;
    const { code, name, location, warning_threshold_cm, danger_threshold_cm, vibration_threshold_g } = req.body;
    
    try {
        const result = await pool.query(
            `UPDATE bridges 
             SET code = $1, name = $2, location = $3, warning_threshold_cm = $4, danger_threshold_cm = $5, vibration_threshold_g = $6
             WHERE id = $7 RETURNING *`,
            [code, name, location, warning_threshold_cm, danger_threshold_cm, vibration_threshold_g, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bridge not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating bridge:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/bridges/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const check = await pool.query('SELECT * FROM bridges WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Bridge not found' });
        }
        
        await pool.query('DELETE FROM readings WHERE bridge_id = $1', [id]);
        await pool.query('DELETE FROM alerts WHERE bridge_id = $1', [id]);
        await pool.query('DELETE FROM bridges WHERE id = $1', [id]);
        
        res.json({ message: 'Bridge deleted successfully' });
    } catch (error) {
        console.error('Error deleting bridge:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== READINGS ENDPOINTS ==========

app.get('/api/readings', async (req, res) => {
    const { bridge_id, limit } = req.query;
    
    try {
        let query = `
            SELECT r.*, b.name as bridge_name, b.code as bridge_code 
            FROM readings r 
            JOIN bridges b ON r.bridge_id = b.id
        `;
        const params = [];
        
        if (bridge_id) {
            query += ' WHERE r.bridge_id = $1';
            params.push(bridge_id);
        }
        
        query += ' ORDER BY r.timestamp DESC';
        
        if (limit) {
            query += ' LIMIT $' + (params.length + 1);
            params.push(parseInt(limit));
        }
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching readings:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/readings', async (req, res) => {
    const { 
        bridge_id, 
        water_level_cm, 
        vibration_g, 
        barrier1_status, 
        barrier2_status, 
        buzzer_status 
    } = req.body;
    
    try {
        const bridge = await pool.query('SELECT * FROM bridges WHERE id = $1', [bridge_id]);
        if (bridge.rows.length === 0) {
            return res.status(404).json({ error: 'Bridge not found' });
        }
        
        const b = bridge.rows[0];
        let alert_level = 'normal';
        
        if (water_level_cm >= b.danger_threshold_cm || vibration_g >= b.vibration_threshold_g * 2) {
            alert_level = 'danger';
        } else if (water_level_cm >= b.warning_threshold_cm || vibration_g >= b.vibration_threshold_g) {
            alert_level = 'warning';
        }
        
        const result = await pool.query(
            `INSERT INTO readings (bridge_id, water_level_cm, vibration_g, barrier1_status, barrier2_status, buzzer_status, alert_level) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [bridge_id, water_level_cm, vibration_g, barrier1_status, barrier2_status, buzzer_status, alert_level]
        );
        
        if (alert_level !== 'normal') {
            let message = '';
            if (alert_level === 'danger') {
                message = `🚨 DANGER: Bridge ${b.code} - Water level: ${water_level_cm}cm (Threshold: ${b.danger_threshold_cm}cm)`;
            } else {
                message = `⚠️ WARNING: Bridge ${b.code} - Water level: ${water_level_cm}cm (Threshold: ${b.warning_threshold_cm}cm)`;
            }
            
            await pool.query(
                `INSERT INTO alerts (bridge_id, alert_type, message, severity) 
                 VALUES ($1, $2, $3, $4)`,
                [bridge_id, 'threshold_alert', message, alert_level]
            );
        }
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating reading:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== ALERTS ENDPOINTS ==========

app.get('/api/alerts', async (req, res) => {
    const { resolved } = req.query;
    
    try {
        let query = `
            SELECT a.*, b.name as bridge_name, b.code as bridge_code 
            FROM alerts a 
            JOIN bridges b ON a.bridge_id = b.id
        `;
        const params = [];
        
        if (resolved === 'true') {
            query += ' WHERE a.is_resolved = true';
        } else if (resolved === 'false') {
            query += ' WHERE a.is_resolved = false';
        }
        
        query += ' ORDER BY a.created_at DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/alerts/:id/resolve', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(
            `UPDATE alerts SET is_resolved = true, resolved_at = NOW() 
             WHERE id = $1 RETURNING *`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error resolving alert:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== STATISTICS ENDPOINTS ==========

app.get('/api/stats', async (req, res) => {
    try {
        const totalBridges = await pool.query('SELECT COUNT(*) FROM bridges');
        const totalReadings = await pool.query('SELECT COUNT(*) FROM readings');
        const activeAlerts = await pool.query('SELECT COUNT(*) FROM alerts WHERE is_resolved = false');
        const dangerAlerts = await pool.query('SELECT COUNT(*) FROM alerts WHERE severity = $1 AND is_resolved = false', ['danger']);
        
        res.json({
            total_bridges: parseInt(totalBridges.rows[0].count),
            total_readings: parseInt(totalReadings.rows[0].count),
            active_alerts: parseInt(activeAlerts.rows[0].count),
            danger_alerts: parseInt(dangerAlerts.rows[0].count)
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== FORGOT PASSWORD ==========

app.post('/api/forgot-password', async (req, res) => {
    const { username } = req.body;
    
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const resetToken = jwt.sign(
            { userId: result.rows[0].id, purpose: 'reset' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        res.json({ 
            message: 'Password reset link sent to your email',
            resetToken: resetToken
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (decoded.purpose !== 'reset') {
            return res.status(400).json({ error: 'Invalid token' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [hashedPassword, decoded.userId]
        );
        
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(400).json({ error: 'Invalid or expired token' });
    }
});

// ========== START SERVER ==========

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
    console.log(`🔑 JWT_SECRET: ${JWT_SECRET}`);
});