-- FOR THE LOGIN CREDENTIALS OF THE USERS
CREATE TYPE user_role AS ENUM ('admin', 'staff');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    surname VARCHAR(50) NOT NULL,
    username VARCHAR(30) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    role user_role NOT NULL
);

-- FOR ALL THE BRIDGES 
CREATE TABLE bridges (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    warning_threshold_cm DECIMAL(5, 1) NOT NULL,
    danger_threshold_cm DECIMAL(5, 1) NOT NULL,
    vibration_threshold_g DECIMAL(4, 2) NOT NULL
);

--FOR ALL THE BRIDGE SENSOR READINGS
CREATE TABLE readings (
    id SERIAL PRIMARY KEY,
    bridge_id INTEGER REFERENCES bridges(id),
    water_level_cm DECIMAL(5, 1) NOT NULL,
    vibration_g DECIMAL(4, 2) NOT NULL,
    barrier1_status BOOLEAN NOT NULL,
    barrier2_status BOOLEAN NOT NULL,
    buzzer_status BOOLEAN NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);