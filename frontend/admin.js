const loggedInUser = JSON.parse(localStorage.getItem("bridgeguard_user"));

const navEntries = performance.getEntriesByType("navigation");
const isReload = navEntries.length > 0 && navEntries[0].type === "reload";

if (isReload) {
  localStorage.removeItem("bridgeguard_user");
}

if (!loggedInUser || loggedInUser.role !== "admin" || isReload) {
  window.location.href = "login.html?reason=notloggedin";
}

document.getElementById("welcome-text").textContent =
  `Logged in as ${loggedInUser.name} (Admin)`;
