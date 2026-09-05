const API_BASE = "http://localhost:3000";

const loggedInUser = JSON.parse(localStorage.getItem("bridgeguard_user"));

const navEntries = performance.getEntriesByType("navigation");
const isReload = navEntries.length > 0 && navEntries[0].type === "reload";

if (isReload) {
  localStorage.removeItem("bridgeguard_user");
}

if (!loggedInUser || isReload) {
  window.location.href = "login.html?reason=notloggedin";
}

async function loadAlerts() {
  const response = await fetch(`${API_BASE}/api/alerts`);
  const alerts = await response.json();

  const listBox = document.getElementById("alerts-list");
  listBox.innerHTML = "";

  if (alerts.length === 0) {
    listBox.innerHTML = `<div class="manage-row-sub">No alerts yet.</div>`;
    return;
  }

  alerts.forEach((alert) => {
    const row = document.createElement("div");
    row.className = "alert-row";

    const isDanger = alert.severity === "danger";
    const iconColor = isDanger ? "#f87171" : "#fbbf24";

    row.innerHTML = `
      <span class="alert-icon" style="color: ${iconColor};">&#9888;</span>
      <div class="alert-text">
        <div class="alert-message">${alert.message}</div>
        <div class="alert-sub">${alert.bridge_name} (${alert.bridge_code})</div>
      </div>
      <div class="alert-time">${new Date(alert.timestamp).toLocaleString()}</div>
    `;
    listBox.appendChild(row);
  });
}

loadAlerts();
