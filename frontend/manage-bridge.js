const API_BASE = "http://localhost:3000";

const loggedInUser = JSON.parse(localStorage.getItem("bridgeguard_user"));

const navEntries = performance.getEntriesByType("navigation");
const isReload = navEntries.length > 0 && navEntries[0].type === "reload";

if (isReload) {
  localStorage.removeItem("bridgeguard_user");
}

if (!loggedInUser || loggedInUser.role !== "admin" || isReload) {
  window.location.href = "login.html?reason=notloggedin";
}

async function loadBridgeList() {
  const response = await fetch(`${API_BASE}/api/bridges`);
  const bridges = await response.json();

  const listBox = document.getElementById("bridge-list");
  listBox.innerHTML = "";

  bridges.forEach((bridge) => {
    const row = document.createElement("div");
    row.className = "manage-row";
    row.innerHTML = `
      <div>
        <div class="manage-row-title">${bridge.name} (${bridge.code})</div>
        <div class="manage-row-sub">${bridge.location}</div>
      </div>
      <button class="delete-btn" data-id="${bridge.id}">Delete</button>
    `;
    listBox.appendChild(row);
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (!confirm("Mark this bridge as inactive?")) return;

      const response = await fetch(`${API_BASE}/api/bridges/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        loadBridgeList();
      } else {
        alert("Failed to delete bridge");
      }
    });
  });
}

document
  .getElementById("add-bridge-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const messageBox = document.getElementById("form-message");
    messageBox.textContent = "";

    const body = {
      code: document.getElementById("code").value,
      name: document.getElementById("name").value,
      location: document.getElementById("location").value,
      warning_threshold_cm: document.getElementById("warning_threshold_cm")
        .value,
      danger_threshold_cm: document.getElementById("danger_threshold_cm").value,
      vibration_threshold_g: document.getElementById("vibration_threshold_g")
        .value,
    };

    try {
      const response = await fetch(`${API_BASE}/api/bridges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        messageBox.style.color = "#f87171";
        messageBox.textContent = data.error || "Failed to add bridge";
        return;
      }

      messageBox.style.color = "#34d399";
      messageBox.textContent = `Bridge "${data.name}" added successfully.`;
      document.getElementById("add-bridge-form").reset();
      loadBridgeList();
    } catch (err) {
      messageBox.style.color = "#f87171";
      messageBox.textContent = "Could not reach the server. Is it running?";
    }
  });

loadBridgeList();
