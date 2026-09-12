// Redirect to login if not authenticated, or if this page was reloaded
const loggedInUser = JSON.parse(localStorage.getItem("bridgeguard_user"));

const navEntries = performance.getEntriesByType("navigation");
const isReload = navEntries.length > 0 && navEntries[0].type === "reload";

if (isReload) {
  localStorage.removeItem("bridgeguard_user");
}

if (!loggedInUser || isReload) {
  window.location.href = "login.html?reason=notloggedin";
}

const API_BASE = "https://floodwarning-webapp-z0sk.onrender.com";

let currentBridgeId = null;
let currentBridge = null;
let waterChart = null;
let vibrationChart = null;
let lastSeenAlertId = 0;

// Loads all bridges into the dropdown
async function loadBridges() {
  const response = await fetch(`${API_BASE}/api/bridges`);
  const bridges = await response.json();

  const select = document.getElementById("bridge-select");

  select.innerHTML = "";

  bridges.forEach((bridge) => {
    const option = document.createElement("option");

    option.value = bridge.id;
    option.textContent = `${bridge.name} (${bridge.code})`;

    select.appendChild(option);
  });

  const params = new URLSearchParams(window.location.search);
  const requestedBridgeId = params.get("bridge");

  const initialBridge = requestedBridgeId
    ? bridges.find((b) => b.id == requestedBridgeId)
    : bridges[0];

  if (initialBridge) {
    select.value = initialBridge.id;

    loadBridgeDetails(initialBridge);
    loadReadings(initialBridge.id);
  }

  select.addEventListener("change", () => {
    const selected = bridges.find((b) => b.id == select.value);

    if (selected) {
      loadBridgeDetails(selected);
      loadReadings(selected.id);
    }
  });
}

// Displays bridge information
function loadBridgeDetails(bridge) {
  currentBridgeId = bridge.id;
  currentBridge = bridge;

  document.getElementById("bridge-name").textContent =
    bridge.name.toUpperCase();

  document.getElementById("bridge-location").textContent = bridge.location;

  document.getElementById("bridge-code").textContent = bridge.code;

  loadWeather(bridge.id);
}

// Loads readings for the selected bridge
async function loadReadings(bridgeId) {
  if (!bridgeId) return;

  const response = await fetch(`${API_BASE}/api/bridges/${bridgeId}/readings`);

  const readings = await response.json();

  if (readings.length === 0) {
    resetDashboardFields();
    return;
  }

  const latest = readings[0];

  updateStatusCards(latest);
  updateCharts(readings);
}

// Resets reading-related dashboard fields
function resetDashboardFields() {
  document.getElementById("bridge-status").textContent = "NO DATA";
  document.getElementById("water-level").textContent = "-- cm";
  document.getElementById("vibration-status").textContent = "--";
  document.getElementById("buzzer-status").textContent = "--";
  document.getElementById("barrier1-status").textContent = "--";
  document.getElementById("barrier2-status").textContent = "--";
  document.getElementById("esp32-status").textContent = "--";
  document.getElementById("last-updated").textContent = "Last updated: --";

  const waterCtx = document.getElementById("water-level-chart");
  const vibrationCtx = document.getElementById("vibration-chart");

  if (waterChart) {
    waterChart.destroy();
  }

  if (vibrationChart) {
    vibrationChart.destroy();
  }

  if (!currentBridge) return;

  const emptyLabels = ["", ""];

  const dangerLine = emptyLabels.map(() =>
    parseFloat(currentBridge.danger_threshold_cm),
  );

  const warningLine = emptyLabels.map(() =>
    parseFloat(currentBridge.warning_threshold_cm),
  );

  const vibrationThresholdLine = emptyLabels.map(() =>
    parseFloat(currentBridge.vibration_threshold_g),
  );

  waterChart = new Chart(waterCtx, {
    type: "line",

    data: {
      labels: emptyLabels,

      datasets: [
        {
          label: "Water Level (cm)",
          data: [],
          pointStyle: "line",
        },

        {
          label: "Danger",
          data: dangerLine,
          borderColor: "#f87171",
          borderDash: [5, 5],
          pointRadius: 0,
          pointStyle: "line",
        },

        {
          label: "Warning",
          data: warningLine,
          borderColor: "#fbbf24",
          borderDash: [5, 5],
          pointRadius: 0,
          pointStyle: "line",
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
          },
        },
      },
    },
  });

  vibrationChart = new Chart(vibrationCtx, {
    type: "line",

    data: {
      labels: emptyLabels,

      datasets: [
        {
          label: "Vibration",
          data: [],
          pointStyle: "line",
        },

        {
          label: "Threshold",
          data: vibrationThresholdLine,
          borderColor: "#f87171",
          borderDash: [5, 5],
          pointRadius: 0,
          pointStyle: "line",
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
          },
        },
      },
    },
  });
}

// Updates the dashboard status cards.
// water_level_cm is RAW sensor distance — SMALLER means MORE dangerous.
function updateStatusCards(reading) {
  if (!currentBridge) return;

  const waterLevel = parseFloat(reading.water_level_cm);
  const vibration = parseFloat(reading.vibration_g);

  const warningThreshold = parseFloat(currentBridge.warning_threshold_cm);

  const dangerThreshold = parseFloat(currentBridge.danger_threshold_cm);

  const vibrationThreshold = parseFloat(currentBridge.vibration_threshold_g);

  // Water level
  if (waterLevel < 0) {
    document.getElementById("water-level").textContent = "No reading";
  } else {
    document.getElementById("water-level").textContent = `${waterLevel} cm`;
  }

  // Vibration status
  document.getElementById("vibration-status").textContent =
    vibration >= vibrationThreshold ? "HIGH" : "NORMAL";

  // Bridge status — smaller distance = more dangerous, so <=
  if (waterLevel < 0) {
    document.getElementById("bridge-status").textContent = "NO DATA";
  } else if (waterLevel <= dangerThreshold) {
    document.getElementById("bridge-status").textContent = "DANGER";
  } else if (waterLevel <= warningThreshold) {
    document.getElementById("bridge-status").textContent = "WARNING";
  } else {
    document.getElementById("bridge-status").textContent = "SAFE";
  }

  // Buzzer status
  document.getElementById("buzzer-status").textContent = reading.buzzer_status
    ? "ACTIVE"
    : "INACTIVE";

  // Barrier 1
  document.getElementById("barrier1-status").textContent =
    reading.barrier1_status ? "OPEN" : "CLOSED";

  // Barrier 2
  document.getElementById("barrier2-status").textContent =
    reading.barrier2_status ? "OPEN" : "CLOSED";

  // ESP32 connection
  document.getElementById("esp32-status").textContent = "CONNECTED";

  // Last update
  document.getElementById("last-updated").textContent =
    "Last updated: " + new Date(reading.timestamp).toLocaleString();
}

// Builds the water and vibration charts
function updateCharts(readings) {
  if (!currentBridge) return;

  const sorted = [...readings].reverse();

  const labels = sorted.map((r) =>
    new Date(r.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  const waterData = sorted.map((r) => parseFloat(r.water_level_cm));

  const vibrationData = sorted.map((r) => parseFloat(r.vibration_g));

  const dangerLine = labels.map(() =>
    parseFloat(currentBridge.danger_threshold_cm),
  );

  const warningLine = labels.map(() =>
    parseFloat(currentBridge.warning_threshold_cm),
  );

  const vibrationThresholdLine = labels.map(() =>
    parseFloat(currentBridge.vibration_threshold_g),
  );

  const waterCtx = document.getElementById("water-level-chart");

  const vibrationCtx = document.getElementById("vibration-chart");

  if (waterChart) {
    waterChart.destroy();
  }

  if (vibrationChart) {
    vibrationChart.destroy();
  }

  waterChart = new Chart(waterCtx, {
    type: "line",

    data: {
      labels,

      datasets: [
        {
          label: "Water Level (cm)",
          data: waterData,
          borderColor: "#38bdf8",
          tension: 0.3,
          pointStyle: "line",
        },

        {
          label: "Danger",
          data: dangerLine,
          borderColor: "#f87171",
          borderDash: [5, 5],
          pointRadius: 0,
          pointStyle: "line",
        },

        {
          label: "Warning",
          data: warningLine,
          borderColor: "#fbbf24",
          borderDash: [5, 5],
          pointRadius: 0,
          pointStyle: "line",
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
          },
        },
      },
    },
  });

  vibrationChart = new Chart(vibrationCtx, {
    type: "line",

    data: {
      labels,

      datasets: [
        {
          label: "Vibration",
          data: vibrationData,
          borderColor: "#c084fc",
          tension: 0.3,
          pointStyle: "line",
        },

        {
          label: "Threshold",
          data: vibrationThresholdLine,
          borderColor: "#f87171",
          borderDash: [5, 5],
          pointRadius: 0,
          pointStyle: "line",
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
          },
        },
      },
    },
  });
}

function weatherCodeToText(code) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Fog";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";

  return "Storm";
}

function weatherCodeToIcon(code) {
  if (code === 0) return "☀️";
  if (code <= 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";

  return "⛈️";
}

async function loadWeather(bridgeId) {
  const response = await fetch(`${API_BASE}/api/bridges/${bridgeId}/weather`);

  const weather = await response.json();

  if (weather.error) return;

  document.getElementById("weather-location").textContent =
    currentBridge.location;

  const widget = document.getElementById("weather-widget");

  const current = weather.current;
  const daily = weather.daily;

  let html = `
    <div class="weather-current">

      <div class="weather-current-icon">
        ${weatherCodeToIcon(current.weather_code)}
      </div>

      <div>

        <div class="weather-current-temp">
          ${Math.round(current.temperature_2m)}°C
        </div>

        <div class="weather-current-desc">
          ${weatherCodeToText(current.weather_code)}
        </div>

      </div>

    </div>

    <div class="weather-days">
  `;

  for (let i = 0; i < 3; i++) {
    const dayLabel =
      i === 0
        ? "Today"
        : new Date(daily.time[i]).toLocaleDateString([], { weekday: "short" });

    html += `
      <div class="weather-day">

        <div class="weather-day-label">
          ${dayLabel}
        </div>

        <div class="weather-day-icon">
          ${weatherCodeToIcon(daily.weather_code[i])}
        </div>

        <div class="weather-day-temp">
          ${Math.round(daily.temperature_2m_max[i])}°/
          ${Math.round(daily.temperature_2m_min[i])}°
        </div>

        <div class="weather-day-rain">
          ${daily.precipitation_probability_max[i]}%
        </div>

      </div>
    `;
  }

  html += `</div>`;

  widget.innerHTML = html;
}

function showAlertPopup(alert) {
  const container = document.getElementById("alert-popup");

  const item = document.createElement("div");

  item.className = "alert-popup-item";

  item.innerHTML = `
    <div class="alert-popup-title">
      ⚠ Critical Alert — Another Bridge
    </div>

    <div class="alert-popup-message">
      ${alert.message}
    </div>

    <div class="alert-popup-sub">
      ${alert.bridge_name} (${alert.bridge_code})
    </div>
  `;

  container.appendChild(item);

  setTimeout(() => {
    item.remove();
  }, 8000);
}

async function loadDashboardAlerts() {
  const response = await fetch(`${API_BASE}/api/alerts`);

  const alerts = await response.json();

  const newDangerAlerts = alerts.filter(
    (a) =>
      a.id > lastSeenAlertId &&
      a.severity === "danger" &&
      a.bridge_id !== currentBridgeId,
  );

  newDangerAlerts.forEach((alert) => {
    showAlertPopup(alert);
  });

  if (alerts.length > 0) {
    lastSeenAlertId = Math.max(...alerts.map((a) => a.id));
  }

  const bridgeAlerts = alerts.filter((a) => a.bridge_id === currentBridgeId);

  const banner = document.getElementById("critical-banner");

  const bannerTitle = document.getElementById("critical-banner-title");

  const bannerSub = document.getElementById("critical-banner-sub");

  const dangerAlerts = bridgeAlerts.filter((a) => a.severity === "danger");

  if (dangerAlerts.length > 0) {
    banner.classList.add("danger");

    bannerTitle.textContent = `${dangerAlerts.length} Critical Alert${
      dangerAlerts.length > 1 ? "s" : ""
    }`;

    bannerSub.textContent = dangerAlerts[0].message;
  } else {
    banner.classList.remove("danger");

    bannerTitle.textContent = "No Critical Alerts";

    bannerSub.textContent = "This bridge is currently safe.";
  }

  const listBox = document.getElementById("dashboard-alerts-list");

  listBox.innerHTML = "";

  bridgeAlerts.slice(0, 3).forEach((alert) => {
    const row = document.createElement("div");

    row.className = "alert-row";

    const iconColor = alert.severity === "danger" ? "#f87171" : "#fbbf24";

    row.innerHTML = `
      <span
        class="alert-icon"
        style="color: ${iconColor};"
      >
        &#9888;
      </span>

      <div class="alert-text">

        <div class="alert-message">
          ${alert.message}
        </div>

        <div class="alert-sub">
          ${alert.bridge_name}
        </div>

      </div>
    `;

    listBox.appendChild(row);
  });
}

// Start dashboard
loadBridges();
loadDashboardAlerts();

// Refresh readings and alerts every 5 minutes
setInterval(() => {
  if (currentBridgeId) {
    loadReadings(currentBridgeId);
  }

  loadDashboardAlerts();
}, 300000);
