const API_BASE = "http://localhost:3000";

const params = new URLSearchParams(window.location.search);
if (params.get("reason") === "notloggedin") {
  document.getElementById("login-error").textContent =
    "Please log in to continue.";
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const errorBox = document.getElementById("login-error");
  errorBox.textContent = "";

  try {
    const response = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      errorBox.textContent = data.error || "Login failed";
      return;
    }

    localStorage.setItem("bridgeguard_user", JSON.stringify(data));

    if (data.role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    errorBox.textContent = "Could not reach the server. Is it running?";
  }
});
