// Redirect to login if not authenticated, or if this page was reloaded
// (reload = force re-login for security)
const loggedInUser = JSON.parse(localStorage.getItem("bridgeguard_user"));

const navEntries = performance.getEntriesByType("navigation");
const isReload = navEntries.length > 0 && navEntries[0].type === "reload";

if (isReload) {
  localStorage.removeItem("bridgeguard_user");
}

if (!loggedInUser || isReload) {
  window.location.href = "login.html?reason=notloggedin";
}

const API_BASE = "http://localhost:3000";
let currentBridgeId = null;
let currentBridge = null;
let waterChart = null;
let vibrationChart = null;
let lastSeenAlertId = 0;

// Loads all bridges into the dropdown, then shows either the one
// requested via ?bridge=<id> in the URL, or the first one by default
async function loadBridges() {
  const response = await fetch(`${API_BASE}/api/bridges`);
  const bridges = await response.json();

  const select = document.getElementById("bridge-select");
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

  // Switch bridges when the dropdown selection changes
  select.addEventListener("change", () => {
    const selected = bridges.find((b) => b.id == select.value);
    if (selected) {
      loadBridgeDetails(selected);
      loadReadings(selected.id);
    }
  });
}

// Fills in the bridge name, location, and code in the header,
// stores the full bridge object for later use (thresholds, weather),
// and loads that bridge's weather widget
function loadBridgeDetails(bridge) {
  currentBridgeId = bridge.id;
  currentBridge = bridge;
  document.getElementById("bridge-name").textContent =
    bridge.name.toUpperCase();
  document.getElementById("bridge-location").textContent = bridge.location;
  document.getElementById("bridge-code").textContent = bridge.code;
  loadWeather(bridge.id);
}

// Fetches this bridge's reading history and updates the status cards + charts.
// If the bridge has no readings at all, resets everything to a blank state
// instead of leaving the previous bridge's data showing.
async function loadReadings(bridgeId) {
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

// Resets all reading-dependent fields to a blank state. Still draws both
// charts with a fixed axis scale and this bridge's threshold lines, just
// with no actual data line, since there are no readings yet.
// Weather is untouched, since it doesn't depend on readings.
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

  if (waterChart) waterChart.destroy();
  if (vibrationChart) vibrationChart.destroy();

  // Two blank labels just to give the threshold lines something to span
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
        { label: "Water Level (cm)", data: [], pointStyle: "line" },
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
      scales: { y: { min: 0, max: 100 } },
      plugins: { legend: { labels: { usePointStyle: true } } },
    },
  });

  vibrationChart = new Chart(vibrationCtx, {
    type: "line",
    data: {
      labels: emptyLabels,
      datasets: [
        { label: "Vibration (g)", data: [], pointStyle: "line" },
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
      scales: { y: { min: 0, max: 1 } },
      plugins: { legend: { labels: { usePointStyle: true } } },
    },
  });
}

// Updates the top status cards using the single most recent reading
function updateStatusCards(reading) {
  // PostgreSQL DECIMAL values come back as strings, so convert to numbers
  const waterLevel = parseFloat(reading.water_level_cm);
  const vibration = parseFloat(reading.vibration_g);

  document.getElementById("water-level").textContent = `${waterLevel} cm`;
  document.getElementById("vibration-status").textContent =
    vibration > 0.7 ? "HIGH" : "NORMAL";
  document.getElementById("bridge-status").textContent =
    waterLevel >= 80 ? "DANGER" : waterLevel >= 50 ? "WARNING" : "SAFE";
  document.getElementById("buzzer-status").textContent = reading.buzzer_status
    ? "ACTIVE"
    : "INACTIVE";
  document.getElementById("barrier1-status").textContent =
    reading.barrier1_status ? "OPEN" : "CLOSED";
  document.getElementById("barrier2-status").textContent =
    reading.barrier2_status ? "OPEN" : "CLOSED";
  document.getElementById("esp32-status").textContent = "CONNECTED";
  document.getElementById("last-updated").textContent =
    "Last updated: " + new Date(reading.timestamp).toLocaleString();
}

// Builds/rebuilds both history charts from the full list of readings,
// including dashed reference lines for this bridge's own thresholds
function updateCharts(readings) {
  // Readings come back newest-first; reverse so charts read left-to-right in time
  const sorted = [...readings].reverse();
  const labels = sorted.map((r) =>
    new Date(r.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
  const waterData = sorted.map((r) => parseFloat(r.water_level_cm));
  const vibrationData = sorted.map((r) => parseFloat(r.vibration_g));

  // Flat lines repeating the threshold value across every label,
  // so they render as straight reference lines on the chart
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

  // Destroy old chart instances before redrawing, or they'll stack up
  if (waterChart) waterChart.destroy();
  if (vibrationChart) vibrationChart.destroy();

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
      plugins: { legend: { labels: { usePointStyle: true } } },
    },
  });

  vibrationChart = new Chart(vibrationCtx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Vibration (g)",
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
      plugins: { legend: { labels: { usePointStyle: true } } },
    },
  });
}

// Converts Open-Meteo's numeric weather codes into a short readable label
function weatherCodeToText(code) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Fog";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  return "Storm";
}

// Converts Open-Meteo's numeric weather codes into a matching emoji icon
function weatherCodeToIcon(code) {
  if (code === 0) return "☀️";
  if (code <= 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

// Fetches and displays the compact weather widget next to Barrier Status:
// a large icon + current temp/condition, plus a 3-day (today + 2 more)
// mini forecast, each with its own icon above the temperature
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
      <div class="weather-current-icon">${weatherCodeToIcon(current.weather_code)}</div>
      <div>
        <div class="weather-current-temp">${Math.round(current.temperature_2m)}°C</div>
        <div class="weather-current-desc">${weatherCodeToText(current.weather_code)}</div>
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
        <div class="weather-day-label">${dayLabel}</div>
        <div class="weather-day-icon">${weatherCodeToIcon(daily.weather_code[i])}</div>
        <div class="weather-day-temp">${Math.round(daily.temperature_2m_max[i])}°/${Math.round(daily.temperature_2m_min[i])}°</div>
        <div class="weather-day-rain">${daily.precipitation_probability_max[i]}%</div>
      </div>
    `;
  }

  html += `</div>`;
  widget.innerHTML = html;
}

// Shows a temporary pop-up notification in the top-right corner for a
// critical alert that belongs to a DIFFERENT bridge than the one being
// viewed right now — this is the "global alert system" behavior.
function showAlertPopup(alert) {
  const container = document.getElementById("alert-popup");

  const item = document.createElement("div");
  item.className = "alert-popup-item";
  item.innerHTML = `
    <div class="alert-popup-title">⚠ Critical Alert — Another Bridge</div>
    <div class="alert-popup-message">${alert.message}</div>
    <div class="alert-popup-sub">${alert.bridge_name} (${alert.bridge_code})</div>
  `;
  container.appendChild(item);

  // Automatically remove the popup after 8 seconds so they don't pile up
  setTimeout(() => {
    item.remove();
  }, 8000);
}

// Updates the critical alert banner and the Recent Alerts panel using
// ONLY the currently viewed bridge's own alerts. Separately, checks
// ALL bridges for brand-new danger alerts belonging to a DIFFERENT
// bridge and pops up a cross-bridge notification for those.
async function loadDashboardAlerts() {
  const response = await fetch(`${API_BASE}/api/alerts`);
  const alerts = await response.json();

  // Alerts we haven't reacted to yet, that are dangerous, and that
  // belong to a bridge other than the one currently being viewed
  const newDangerAlerts = alerts.filter(
    (a) =>
      a.id > lastSeenAlertId &&
      a.severity === "danger" &&
      a.bridge_id !== currentBridgeId,
  );

  newDangerAlerts.forEach((alert) => showAlertPopup(alert));

  if (alerts.length > 0) {
    lastSeenAlertId = Math.max(...alerts.map((a) => a.id));
  }

  // From here on, only this bridge's own alerts are used —
  // the banner and Recent Alerts panel are per-bridge, not global
  const bridgeAlerts = alerts.filter((a) => a.bridge_id === currentBridgeId);

  const banner = document.getElementById("critical-banner");
  const bannerTitle = document.getElementById("critical-banner-title");
  const bannerSub = document.getElementById("critical-banner-sub");

  const dangerAlerts = bridgeAlerts.filter((a) => a.severity === "danger");

  if (dangerAlerts.length > 0) {
    banner.classList.add("danger");
    bannerTitle.textContent = `${dangerAlerts.length} Critical Alert${dangerAlerts.length > 1 ? "s" : ""}`;
    bannerSub.textContent = dangerAlerts[0].message;
  } else {
    banner.classList.remove("danger");
    bannerTitle.textContent = "No Critical Alerts";
    bannerSub.textContent = "This bridge is currently safe.";
  }

  const listBox = document.getElementById("dashboard-alerts-list");
  listBox.innerHTML = "";

  // Only show this bridge's 3 most recent alerts
  // (the full cross-bridge list still lives on alerts.html)
  bridgeAlerts.slice(0, 3).forEach((alert) => {
    const row = document.createElement("div");
    row.className = "alert-row";
    const iconColor = alert.severity === "danger" ? "#f87171" : "#fbbf24";
    row.innerHTML = `
      <span class="alert-icon" style="color: ${iconColor};">&#9888;</span>
      <div class="alert-text">
        <div class="alert-message">${alert.message}</div>
        <div class="alert-sub">${alert.bridge_name}</div>
      </div>
    `;
    listBox.appendChild(row);
  });
}

loadBridges();
loadDashboardAlerts();

// Every 10 seconds: refresh the currently viewed bridge's readings/charts,
// and check for new alerts (including popping up cross-bridge critical ones)
setInterval(() => {
  loadReadings(currentBridgeId);
  loadDashboardAlerts();
}, 10000);
