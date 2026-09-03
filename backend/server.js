require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;
app.use(express.json());

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

// Returns the list of all bridges (id, code, name, location, thresholds).
// Used to power the search/dropdown and bridge details on the dashboard.
app.get("/api/bridges", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM bridges");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong fetching bridges" });
  }
});

// Returns all sensor readings for one specific bridge, newest first.
// Used to power the history graphs and current status cards on the dashboard.
app.get("/api/bridges/:id/readings", async (req, res) => {
  try {
    const bridgeId = req.params.id;
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

// Adds a new bridge to the database.
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

    // Creates a new staff or admin account.
    // Expects a JSON body with: name, surname, username, password, phone_number, role
    app.post("/api/users", async (req, res) => {
      try {
        const { name, surname, username, password, phone_number, role } =
          req.body;

        // Hash the plain password before storing it — never save it as-is
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
        res
          .status(500)
          .json({ error: "Something went wrong creating the user" });
      }
    });

    // Checks a username/password against stored users.
    // Expects a JSON body with: username, password
    app.post("/api/login", async (req, res) => {
      try {
        const { username, password } = req.body;

        const result = await pool.query(
          "SELECT * FROM users WHERE username = $1",
          [username],
        );

        if (result.rows.length === 0) {
          return res
            .status(401)
            .json({ error: "Invalid username or password" });
        }

        const user = result.rows[0];
        const passwordMatches = await bcrypt.compare(
          password,
          user.password_hash,
        );

        if (!passwordMatches) {
          return res
            .status(401)
            .json({ error: "Invalid username or password" });
        }

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

    // Receives a new sensor reading from the ESP32 for a specific bridge.
    // Expects a JSON body with: bridge_id, water_level_cm, vibration_g,
    // barrier1_status, barrier2_status, buzzer_status
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
        res
          .status(500)
          .json({ error: "Something went wrong saving the reading" });
      }
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong adding the bridge" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
