const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
    } else {
        console.log('✅ Database connected successfully!');
    }
});

const JWT_SECRET = process.env.JWT_SECRET || 'floodwarning_super_secret_key_2026';

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

// ========== BRIDGE ENDPOINTS ==========

// Get all bridges
app.get('/api/bridges', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM bridges ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching bridges:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single bridge
app.get('/api/bridges/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query('SELECT * FROM bridges WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bridge not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching bridge:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new bridge
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

// ========== READINGS ENDPOINTS ==========

// Get all readings
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

// Create new reading (ESP32 will send data here)
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
        // Check thresholds
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
        
        // Create alert if needed
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

// Get all alerts
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

// ========== CONTROL ENDPOINTS (ESP32) ==========

// Get control status for a bridge
app.get('/api/control/:bridge_id', async (req, res) => {
    const { bridge_id } = req.params;
    
    try {
        const result = await pool.query(
            `SELECT * FROM readings WHERE bridge_id = $1 ORDER BY timestamp DESC LIMIT 1`,
            [bridge_id]
        );
        
        if (result.rows.length === 0) {
            return res.json({ barrier1: false, barrier2: false, buzzer: false });
        }
        
        const reading = result.rows[0];
        res.json({
            barrier1: reading.barrier1_status,
            barrier2: reading.barrier2_status,
            buzzer: reading.buzzer_status,
            alert_level: reading.alert_level
        });
    } catch (error) {
        console.error('Error getting control status:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== STATISTICS ENDPOINTS ==========

// Get dashboard statistics
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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
});