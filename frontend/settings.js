const loggedInUser = JSON.parse(localStorage.getItem("bridgeguard_user"));

const navEntries = performance.getEntriesByType("navigation");
const isReload = navEntries.length > 0 && navEntries[0].type === "reload";

if (isReload) {
  localStorage.removeItem("bridgeguard_user");
}

if (!loggedInUser || isReload) {
  window.location.href = "login.html?reason=notloggedin";
}

document.getElementById("settings-name").textContent =
  `${loggedInUser.name} ${loggedInUser.surname}`;
document.getElementById("settings-username").textContent =
  loggedInUser.username;
document.getElementById("settings-role").textContent = loggedInUser.role;

function updateThemeButtonText() {
  const isLight =
    document.documentElement.getAttribute("data-theme") === "light";
  document.getElementById("theme-toggle").textContent = isLight
    ? "Switch to Dark Mode"
    : "Switch to Light Mode";
}

updateThemeButtonText();

document.getElementById("theme-toggle").addEventListener("click", () => {
  const isLight =
    document.documentElement.getAttribute("data-theme") === "light";

  if (isLight) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("bridgeguard_theme", "dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("bridgeguard_theme", "light");
  }

  updateThemeButtonText();
});

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("bridgeguard_user");
  window.location.href = "login.html";
});
