const loggedInUser = JSON.parse(localStorage.getItem("bridgeguard_user"));

if (!loggedInUser || loggedInUser.role !== "admin") {
  window.location.href = "login.html?reason=notloggedin";
}

document.getElementById("welcome-text").textContent =
  `Logged in as ${loggedInUser.name} (Admin)`;
