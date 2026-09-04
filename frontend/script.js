const loggedInUser = JSON.parse(localStorage.getItem("bridgeguard_user"));

const navEntries = performance.getEntriesByType("navigation");
const isReload = navEntries.length > 0 && navEntries[0].type === "reload";

if (isReload) {
  localStorage.removeItem("bridgeguard_user");
}

if (!loggedInUser || isReload) {
  window.location.href = "login.html?reason=notloggedin";
}

if (!loggedInUser) {
  window.location.href = "login.html?reason=notloggedin";
}

const API_BASE = "http://localhost:3000";
let currentBridgeId = null;
let waterChart = null;
let vibrationChart = null;

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

  if (bridges.length > 0) {
    select.value = bridges[0].id;
    loadBridgeDetails(bridges[0]);
    loadReadings(bridges[0].id);
  }

  select.addEventListener("change", () => {
    const selected = bridges.find((b) => b.id == select.value);
    if (selected) {
      loadBridgeDetails(selected);
      loadReadings(selected.id);
    }
  });
}

function loadBridgeDetails(bridge) {
  currentBridgeId = bridge.id;
  document.getElementById("bridge-name").textContent =
    bridge.name.toUpperCase();
  document.getElementById("bridge-location").textContent = bridge.location;
  document.getElementById("bridge-code").textContent = bridge.code;
}

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

function updateStatusCards(reading) {
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

function updateCharts(readings) {
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
    options: { responsive: true },
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
    options: { responsive: true },
  });
}

loadBridges();
