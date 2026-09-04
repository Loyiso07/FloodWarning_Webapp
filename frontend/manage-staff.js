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

async function loadStaffList() {
  const response = await fetch(`${API_BASE}/api/users`);
  const users = await response.json();

  const listBox = document.getElementById("staff-list");
  listBox.innerHTML = "";

  users.forEach((user) => {
    const row = document.createElement("div");
    row.className = "manage-row";
    row.innerHTML = `
      <div>
        <div class="manage-row-title">${user.name} ${user.surname} (@${user.username})</div>
        <div class="manage-row-sub">${user.role}</div>
      </div>
      <button class="delete-btn" data-id="${user.id}">Delete</button>
    `;
    listBox.appendChild(row);
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (!confirm("Mark this account as inactive?")) return;

      const response = await fetch(`${API_BASE}/api/users/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        loadStaffList();
      } else {
        alert("Failed to delete account");
      }
    });
  });
}

document
  .getElementById("add-staff-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const messageBox = document.getElementById("form-message");
    messageBox.textContent = "";

    const body = {
      name: document.getElementById("name").value,
      surname: document.getElementById("surname").value,
      username: document.getElementById("username").value,
      password: document.getElementById("password").value,
      phone_number: document.getElementById("phone_number").value,
      role: document.getElementById("role").value,
    };

    try {
      const response = await fetch(`${API_BASE}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        messageBox.style.color = "#f87171";
        messageBox.textContent = data.error || "Failed to add account";
        return;
      }

      messageBox.style.color = "#34d399";
      messageBox.textContent = `Account "${data.username}" created successfully.`;
      document.getElementById("add-staff-form").reset();
      loadStaffList();
    } catch (err) {
      messageBox.style.color = "#f87171";
      messageBox.textContent = "Could not reach the server. Is it running?";
    }
  });

loadStaffList();
