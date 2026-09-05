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
let waterChart = null;
let vibrationChart = null;

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

// Fills in the bridge name, location, and code in the header
function loadBridgeDetails(bridge) {
  currentBridgeId = bridge.id;
  document.getElementById("bridge-name").textContent =
    bridge.name.toUpperCase();
  document.getElementById("bridge-location").textContent = bridge.location;
  document.getElementById("bridge-code").textContent = bridge.code;
}

// Fetches this bridge's reading history and updates the status cards + charts
async function loadReadings(bridgeId) {
  const response = await fetch(`${API_BASE}/api/bridges/${bridgeId}/readings`);
  const readings = await response.json();

  if (readings.length === 0) {
    document.getElementById("bridge-status").textContent = "NO DATA";
    return;
  }

  const latest = readings[0];
  updateStatusCards(latest);
  updateCharts(readings);
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

// Builds/rebuilds both history charts from the full list of readings
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
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
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
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

// Updates the critical alert banner and the Recent Alerts panel,
// using alerts across ALL bridges (not just the one currently viewed)
async function loadDashboardAlerts() {
  const response = await fetch(`${API_BASE}/api/alerts`);
  const alerts = await response.json();

  const banner = document.getElementById("critical-banner");
  const bannerTitle = document.getElementById("critical-banner-title");
  const bannerSub = document.getElementById("critical-banner-sub");

  const dangerAlerts = alerts.filter((a) => a.severity === "danger");

  if (dangerAlerts.length > 0) {
    banner.classList.add("danger");
    bannerTitle.textContent = `${dangerAlerts.length} Critical Alert${dangerAlerts.length > 1 ? "s" : ""}`;
    bannerSub.textContent = dangerAlerts[0].message;
  } else {
    banner.classList.remove("danger");
    bannerTitle.textContent = "No Critical Alerts";
    bannerSub.textContent = "All monitored bridges are currently safe.";
  }

  const listBox = document.getElementById("dashboard-alerts-list");
  listBox.innerHTML = "";

  // Only show the 5 most recent alerts here (full list lives on alerts.html)
  alerts.slice(0, 5).forEach((alert) => {
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
