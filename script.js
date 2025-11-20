const input = document.getElementById("cityInput");
const button = document.getElementById("searchBtn");

const API_KEY = "a4e184b02ddaff01c5062dc8b049b077";

button.addEventListener("click", () => {
  const value = input.value.trim();

  if (value === "") return;

  // If the user typed numbers → assume ZIP code
  if (/^\d+$/.test(value)) {
    getCityFromZip(value);
  } else {
    document.getElementById("selectedCity").textContent = value;
    getWeather(value);
  }
});
function getCityFromZip(zip) {
  const url = `https://api.openweathermap.org/data/2.5/weather?zip=${zip}&appid=${API_KEY}&units=imperial`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.cod !== 200) {
        alert("ZIP code not found!");
        return;
      }

      const cityName = data.name; // city from API

      document.getElementById("selectedCity").textContent = cityName;
      getWeather(cityName);
    });
}


// -------------------- MAIN WEATHER FUNCTION --------------------
function getWeather(city) {

  // CURRENT WEATHER
  const currentURL =
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=imperial`;

  // FORECAST (5 days, 3 hour steps)
  const forecastURL =
    `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=imperial`;

  // Fetch current weather
  fetch(currentURL)
    .then(res => res.json())
    .then(current => {
      if(current.cod !== 200) {
        alert("City not found!");
        return;
      }
      showCurrent(current);
    });

  // Fetch forecast
  fetch(forecastURL)
    .then(res => res.json())
    .then(forecast => {
      showHourly(forecast.list);
      showDaily(forecast.list);
    });
}

// -------------------- DISPLAY CURRENT WEATHER --------------------
function showCurrent(current) {
  const box = document.getElementById("current");

  box.innerHTML = `
    <h2>Current Weather</h2>
    <p><strong>Temperature:</strong> ${current.main.temp}°F</p>
    <p><strong>Feels Like:</strong> ${current.main.feels_like}°F</p>
    <p><strong>Humidity:</strong> ${current.main.humidity}%</p>
    <p><strong>Wind:</strong> ${current.wind.speed} mph</p>
    <p><strong>Conditions:</strong> ${current.weather[0].description}</p>
  `;
}

// -------------------- DISPLAY HOURLY WEATHER --------------------
function showHourly(list) {
  const box = document.getElementById("hourly");

  let html = "<h2>Hourly Forecast (next ~15 hours)</h2>";
  html += "<div class='hour-list'>";

  // First 5 forecast entries = next 15 hours
  for (let i = 0; i < 5; i++) {
    const hour = list[i];

    const time = new Date(hour.dt * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    html += `
      <div class="hour-item">
        <p><strong>${time}</strong></p>
        <p>${hour.main.temp}°F</p>
        <p>${hour.weather[0].description}</p>
      </div>
    `;
  }

  html += "</div>";
  box.innerHTML = html;
}

// -------------------- DISPLAY DAILY WEATHER --------------------
function showDaily(list) {
  const box = document.getElementById("daily");

  let html = "<h2>Daily Forecast (5 days)</h2>";
  html += "<div class='day-list'>";

  // Group forecast by day (every 8 entries = 24 hours)
  for (let i = 0; i < list.length; i += 8) {
    const day = list[i];

    const date = new Date(day.dt * 1000);
    const weekday = date.toLocaleDateString("en-US", { weekday: "long" });

    html += `
      <div class="day-item">
        <p><strong>${weekday}</strong></p>
        <p>High: ${day.main.temp_max}°F</p>
        <p>Low: ${day.main.temp_min}°F</p>
        <p>${day.weather[0].description}</p>
      </div>
    `;
  }

  html += "</div>";
  box.innerHTML = html;
}

