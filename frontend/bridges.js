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

async function loadAllBridges() {
  const response = await fetch(`${API_BASE}/api/bridges/all`);
  const bridges = await response.json();

  const listBox = document.getElementById("bridges-list");
  listBox.innerHTML = "";

  bridges.forEach((bridge) => {
    const row = document.createElement("a");
    row.className = "bridge-list-row";
    row.href = bridge.is_active ? `dashboard.html?bridge=${bridge.id}` : "#";
    if (!bridge.is_active) {
      row.style.pointerEvents = "none";
    }

    row.innerHTML = `
      <span class="status-dot ${bridge.is_active ? "dot-active" : "dot-inactive"}"></span>
      <span class="bridge-row-name">${bridge.name}</span>
      <span class="bridge-row-location">${bridge.location}</span>
      <span class="bridge-row-status ${bridge.is_active ? "text-active" : "text-inactive"}">
        ${bridge.is_active ? "Active" : "Inactive"}
      </span>
    `;
    listBox.appendChild(row);
  });
}

loadAllBridges();
