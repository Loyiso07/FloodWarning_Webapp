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
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const WEATHER_CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

app.get("/", (req, res) => {
  res.send("BridgeGuard backend is running");
});

// GET /api/bridges
app.get("/api/bridges", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM bridges WHERE is_active = true",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Something went wrong fetching bridges",
    });
  }
});

// GET /api/bridges/:id/readings
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
    res.status(500).json({
      error: "Something went wrong fetching readings",
    });
  }
});

// GET /api/bridges/:id/weather
// Cached in the database (not server memory) for 1 hour per bridge, since
// Render's free tier restarts periodically and would otherwise wipe an
// in-memory cache constantly.
app.get("/api/bridges/:id/weather", async (req, res) => {
  try {
    const bridgeId = req.params.id;

    const cacheResult = await pool.query(
      "SELECT data, fetched_at FROM weather_cache WHERE bridge_id = $1",
      [bridgeId],
    );

    if (cacheResult.rows.length > 0) {
      const cached = cacheResult.rows[0];
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      if (age < WEATHER_CACHE_DURATION_MS) {
        console.log(`Using cached weather for bridge ${bridgeId}`);
        return res.json(cached.data);
      }
    }

    const bridgeResult = await pool.query(
      "SELECT latitude, longitude FROM bridges WHERE id = $1",
      [bridgeId],
    );

    if (bridgeResult.rows.length === 0) {
      return res.status(404).json({
        error: "Bridge not found",
      });
    }

    const { latitude, longitude } = bridgeResult.rows[0];

    if (latitude === null || longitude === null) {
      return res.status(400).json({
        error: "This bridge has no location set",
      });
    }

    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&current=temperature_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m` +
      `&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
      `&timezone=auto&forecast_days=4`;

    const weatherResponse = await fetch(weatherUrl);

    if (!weatherResponse.ok) {
      throw new Error(`Weather API returned ${weatherResponse.status}`);
    }

    const weatherData = await weatherResponse.json();

    await pool.query(
      `INSERT INTO weather_cache (bridge_id, data, fetched_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (bridge_id) DO UPDATE SET data = $2, fetched_at = NOW()`,
      [bridgeId, weatherData],
    );

    console.log(`Fetched fresh weather for bridge ${bridgeId}`);

    res.json(weatherData);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Something went wrong fetching weather",
    });
  }
});

// POST /api/bridges
app.post("/api/bridges", async (req, res) => {
  try {
    const {
      code,
      name,
      location,
      warning_threshold_cm,
      danger_threshold_cm,
      vibration_threshold_g,
      latitude,
      longitude,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO bridges
        (code, name, location, warning_threshold_cm, danger_threshold_cm, vibration_threshold_g, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        code,
        name,
        location,
        warning_threshold_cm,
        danger_threshold_cm,
        vibration_threshold_g,
        latitude,
        longitude,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Something went wrong adding the bridge",
    });
  }
});

app.get("/api/bridges/all", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM bridges ORDER BY name");

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Something went wrong fetching bridges",
    });
  }
});

// DELETE /api/bridges/:id
app.delete("/api/bridges/:id", async (req, res) => {
  try {
    const bridgeId = req.params.id;

    const result = await pool.query(
      "UPDATE bridges SET is_active = false WHERE id = $1 RETURNING *",
      [bridgeId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Bridge not found",
      });
    }

    res.json({
      message: "Bridge marked inactive",
      bridge: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Something went wrong deleting the bridge",
    });
  }
});

// POST /api/readings
// water_level_cm is the RAW ultrasonic distance from sensor to water —
// smaller values mean MORE danger (water closer to the sensor).
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

    const bridgeResult = await pool.query(
      "SELECT warning_threshold_cm, danger_threshold_cm, vibration_threshold_g FROM bridges WHERE id = $1",
      [bridge_id],
    );

    const thresholds = bridgeResult.rows[0];

    if (thresholds) {
      if (water_level_cm <= thresholds.danger_threshold_cm) {
        await pool.query(
          `INSERT INTO alerts (bridge_id, alert_type, severity, value, message)
           VALUES ($1, 'water_level', 'danger', $2, $3)`,
          [
            bridge_id,
            water_level_cm,
            `Water level reached ${water_level_cm}cm — DANGER`,
          ],
        );
      } else if (water_level_cm <= thresholds.warning_threshold_cm) {
        await pool.query(
          `INSERT INTO alerts (bridge_id, alert_type, severity, value, message)
           VALUES ($1, 'water_level', 'warning', $2, $3)`,
          [
            bridge_id,
            water_level_cm,
            `Water level reached ${water_level_cm}cm — WARNING`,
          ],
        );
      }

      if (vibration_g >= thresholds.vibration_threshold_g) {
        await pool.query(
          `INSERT INTO alerts (bridge_id, alert_type, severity, value, message)
           VALUES ($1, 'vibration', 'warning', $2, $3)`,
          [
            bridge_id,
            vibration_g,
            `Elevated vibration detected: ${vibration_g}g`,
          ],
        );
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Something went wrong saving the reading",
    });
  }
});

// GET /api/alerts
app.get("/api/alerts", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT alerts.*, bridges.name AS bridge_name, bridges.code AS bridge_code
       FROM alerts
       JOIN bridges ON alerts.bridge_id = bridges.id
       ORDER BY alerts.timestamp DESC
       LIMIT 50`,
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Something went wrong fetching alerts",
    });
  }
});

// POST /api/users
app.post("/api/users", async (req, res) => {
  try {
    const { name, surname, username, password, phone_number, role } = req.body;

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users
        (name, surname, username, password_hash, phone_number, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, surname, username, phone_number, role`,
      [name, surname, username, password_hash, phone_number, role],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Something went wrong creating the user",
    });
  }
});

// List all staff
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, surname, username, phone_number, role FROM users WHERE is_active = true",
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Something went wrong fetching users",
    });
  }
});

// DELETE /api/users/:id
app.delete("/api/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await pool.query(
      "UPDATE users SET is_active = false WHERE id = $1 RETURNING id, name, surname, username, role",
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      message: "User marked inactive",
      user: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Something went wrong deleting the user",
    });
  }
});

// POST /api/login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "Invalid username or password",
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        error: "This account is inactive",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        error: "Invalid username or password",
      });
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
    res.status(500).json({
      error: "Something went wrong logging in",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
