const savedTheme = localStorage.getItem("bridgeguard_theme");
if (savedTheme === "light") {
  document.documentElement.setAttribute("data-theme", "light");
}
