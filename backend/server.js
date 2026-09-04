require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  host: "localhost",
});

app.get("/", (req, res) => {
  res.send("BridgeGuard backend is running");
});

// GET /api/bridges
// Returns the list of active bridges (id, code, name, location, thresholds).
// Used to power the search/dropdown and bridge details on the dashboard.
// Inactive (soft-deleted) bridges are excluded.
app.get("/api/bridges", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM bridges WHERE is_active = true",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong fetching bridges" });
  }
});

// GET /api/bridges/:id/readings
// Returns all sensor readings for one specific bridge, newest first.
// Used to power the history graphs and current status cards on the dashboard.
app.get("/api/bridges/:id/readings", async (req, res) => {
  try {
    const bridgeId = req.params.id;
    // Using $1 instead of inserting bridgeId directly into the string
    // protects against SQL injection (malicious input in the URL)
    const result = await pool.query(
      "SELECT * FROM readings WHERE bridge_id = $1 ORDER BY timestamp DESC",
      [bridgeId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong fetching readings" });
  }
});

// POST /api/bridges
// Adds a new bridge to the database. Admin-only feature on the frontend.
// Expects a JSON body with: code, name, location,
// warning_threshold_cm, danger_threshold_cm, vibration_threshold_g
app.post("/api/bridges", async (req, res) => {
  try {
    const {
      code,
      name,
      location,
      warning_threshold_cm,
      danger_threshold_cm,
      vibration_threshold_g,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO bridges 
        (code, name, location, warning_threshold_cm, danger_threshold_cm, vibration_threshold_g)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        code,
        name,
        location,
        warning_threshold_cm,
        danger_threshold_cm,
        vibration_threshold_g,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong adding the bridge" });
  }
});

app.get("/api/bridges/all", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM bridges ORDER BY name");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong fetching bridges" });
  }
});

// DELETE /api/bridges/:id
// Soft-deletes a bridge by marking it inactive instead of removing it,
// so its reading history stays intact. Admin-only feature on the frontend.
app.delete("/api/bridges/:id", async (req, res) => {
  try {
    const bridgeId = req.params.id;
    const result = await pool.query(
      "UPDATE bridges SET is_active = false WHERE id = $1 RETURNING *",
      [bridgeId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bridge not found" });
    }

    res.json({ message: "Bridge marked inactive", bridge: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong deleting the bridge" });
  }
});

// POST /api/readings
// Receives a new sensor reading from the ESP32 for a specific bridge.
// Expects a JSON body with: bridge_id, water_level_cm, vibration_g,
// barrier1_status, barrier2_status, buzzer_status
// timestamp is filled in automatically by PostgreSQL (DEFAULT NOW()).
app.post("/api/readings", async (req, res) => {
  try {
    const {
      bridge_id,
      water_level_cm,
      vibration_g,
      barrier1_status,
      barrier2_status,
      buzzer_status,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO readings 
        (bridge_id, water_level_cm, vibration_g, barrier1_status, barrier2_status, buzzer_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        bridge_id,
        water_level_cm,
        vibration_g,
        barrier1_status,
        barrier2_status,
        buzzer_status,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong saving the reading" });
  }
});

// POST /api/users
// Creates a new staff or admin account. Admin-only feature on the frontend.
// Expects a JSON body with: name, surname, username, password, phone_number, role
// The plain password is hashed with bcrypt before being stored — never saved as-is.
app.post("/api/users", async (req, res) => {
  try {
    const { name, surname, username, password, phone_number, role } = req.body;
    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, surname, username, password_hash, phone_number, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, surname, username, phone_number, role`,
      [name, surname, username, password_hash, phone_number, role],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong creating the user" });
  }
});

//List all staff
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, surname, username, phone_number, role FROM users WHERE is_active = true",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong fetching users" });
  }
});

// DELETE /api/users/:id
// Soft-deletes a staff/admin account by marking it inactive instead of
// removing it. Inactive accounts are blocked from logging in (see /api/login).
// Admin-only feature on the frontend.
app.delete("/api/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const result = await pool.query(
      "UPDATE users SET is_active = false WHERE id = $1 RETURNING id, name, surname, username, role",
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User marked inactive", user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong deleting the user" });
  }
});

// POST /api/login
// Checks a username/password against stored users.
// Expects a JSON body with: username, password
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    // Keep this message vague on purpose — don't reveal whether the
    // username exists, to prevent attackers from discovering real accounts
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = result.rows[0];

    // Block soft-deleted (inactive) accounts from logging in.
    // This is fine to state plainly, unlike the username/password check above.
    if (!user.is_active) {
      return res.status(403).json({ error: "This account is inactive" });
    }

    // bcrypt.compare hashes the typed password the same way and checks
    // it against the stored hash — the plain password is never stored
    // or reversed at any point
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Deliberately excludes password_hash from the response
    res.json({
      id: user.id,
      name: user.name,
      surname: user.surname,
      username: user.username,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong logging in" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
