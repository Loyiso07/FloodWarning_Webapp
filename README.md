# 🌊 Flood Warning Web Application

IoT-based bridge flood monitoring system with real-time alerts and automated barrier control.

## 🎯 Project Overview
This system monitors water levels and structural vibrations on bridges, providing real-time alerts and automated safety mechanisms during flood events. Designed specifically for South African rural and peri-urban areas.

## 📋 Features
- ✅ Real-time water level monitoring using HC-SR04 Ultrasonic Sensor
- ✅ Structural vibration detection with Piezoelectric sensor
- ✅ Automated barrier control via Servo motor
- ✅ Visual alerts (Green/Yellow/Red LEDs)
- ✅ Audible warnings (Piezo buzzer)
- ✅ Local display (1602 LCD)
- ✅ Cloud integration with ThingSpeak
- ✅ Web dashboard with live charts
- ✅ Alert logging and notifications

## 🛠️ Hardware Components

| Component | Purpose | Pin Connection |
|-----------|---------|----------------|
| ESP32 | Main controller with WiFi | - |
| HC-SR04 | Water level measurement | TRIG: D5, ECHO: D18 |
| Piezoelectric Sensor | Vibration monitoring | D34 (ADC) |
| 1602 LCD I2C | Local display | SDA: D21, SCL: D22 |
| LEDs (Green/Yellow/Red) | Visual status | D25, D26, D27 |
| Piezo Buzzer | Audible alarm | D32 |
| Servo Motor | Barrier actuator | D33 |

## 🏗️ System Architecture
