const API_BASE = "http://localhost:3000";

// Redirect to login if not authenticated, or if this page was reloaded
// (reload = force re-login for security)
const loggedInUser = JSON.parse(localStorage.getItem("bridgeguard_user"));

const navEntries = performance.getEntriesByType("navigation");
const isReload = navEntries.length > 0 && navEntries[0].type === "reload";

if (isReload) {
  localStorage.removeItem("bridgeguard_user");
}

if (!loggedInUser || isReload) {
  window.location.href = "login.html?reason=notloggedin";
}

// Converts Open-Meteo's numeric weather codes into a short readable label
function weatherCodeToText(code) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Fog";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  return "Storm";
}

// Converts Open-Meteo's numeric weather codes into a matching emoji icon
function weatherCodeToIcon(code) {
  if (code === 0) return "☀️";
  if (code <= 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

// Converts a wind direction in degrees (0-360) into a compass label
function windDirectionToCompass(degrees) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

// Loads and displays the hourly row (today, 12 hours from now) and
// the 3-day forecast list for the selected bridge
async function loadWeatherPage(bridgeId) {
  const response = await fetch(`${API_BASE}/api/bridges/${bridgeId}/weather`);
  const weather = await response.json();

  if (weather.error) {
    document.getElementById("hourly-row").textContent =
      "No weather data available.";
    return;
  }

  const hourlyRow = document.getElementById("hourly-row");
  hourlyRow.innerHTML = "";

  // Open-Meteo returns a full array of hourly times starting from
  // midnight today, so find the index matching the current hour
  // and show the next 12 hours from there
  const now = new Date();
  const currentHourIndex = weather.hourly.time.findIndex((t) => {
    const time = new Date(t);
    return (
      time.getDate() === now.getDate() && time.getHours() >= now.getHours()
    );
  });

  for (let i = currentHourIndex; i < currentHourIndex + 12; i++) {
    const time = new Date(weather.hourly.time[i]);
    const temp = Math.round(weather.hourly.temperature_2m[i]);
    const windSpeed = Math.round(weather.hourly.wind_speed_10m[i]);
    const windDir = windDirectionToCompass(
      weather.hourly.wind_direction_10m[i],
    );
    const desc = weatherCodeToText(weather.hourly.weather_code[i]);
    const icon = weatherCodeToIcon(weather.hourly.weather_code[i]);

    const item = document.createElement("div");
    item.className = "hourly-item";
    item.innerHTML = `
      <div class="hourly-time">${time.toLocaleTimeString([], { hour: "2-digit" })}</div>
      <div class="hourly-icon">${icon}</div>
      <div class="hourly-temp">${temp}°</div>
      <div class="hourly-desc">${desc}</div>
      <div class="hourly-wind">${windSpeed}km/h ${windDir}</div>
    `;
    hourlyRow.appendChild(item);
  }

  // Daily forecast: index 0 is today (already shown above via hourly),
  // so start from index 1 for "next 3 days"
  const dailyList = document.getElementById("daily-list");
  dailyList.innerHTML = "";

  for (let i = 1; i <= 3; i++) {
    const dayLabel = new Date(weather.daily.time[i]).toLocaleDateString([], {
      weekday: "long",
    });
    const icon = weatherCodeToIcon(weather.daily.weather_code[i]);
    const row = document.createElement("div");
    row.className = "manage-row";
    row.innerHTML = `
      <div>
        <div class="manage-row-title">${icon} ${dayLabel}</div>
        <div class="manage-row-sub">${weatherCodeToText(weather.daily.weather_code[i])} · ${weather.daily.precipitation_probability_max[i]}% rain</div>
      </div>
      <div class="manage-row-title">${Math.round(weather.daily.temperature_2m_max[i])}° / ${Math.round(weather.daily.temperature_2m_min[i])}°</div>
    `;
    dailyList.appendChild(row);
  }
}

// Fills the bridge picker dropdown, then loads weather for the first
// bridge by default and reloads it whenever the selection changes
async function loadBridgesIntoSelect() {
  const response = await fetch(`${API_BASE}/api/bridges`);
  const bridges = await response.json();

  const select = document.getElementById("bridge-select");
  bridges.forEach((bridge) => {
    const option = document.createElement("option");
    option.value = bridge.id;
    option.textContent = bridge.name;
    select.appendChild(option);
  });

  if (bridges.length > 0) {
    select.value = bridges[0].id;
    loadWeatherPage(bridges[0].id);
  }

  select.addEventListener("change", () => {
    if (select.value) loadWeatherPage(select.value);
  });
}

loadBridgesIntoSelect();
