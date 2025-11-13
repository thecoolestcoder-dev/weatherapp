// =======================
// Weather Predictor v1
// =======================

// ----- CONFIG -----
const API_KEY = "5a6ffa372d80cd07f319b9247dc2f3bf"; // your OpenWeather API key
; // <-- put your OpenWeather API key here
// OpenWeather One Call v2/v3 endpoint (2.5 style works without extra headers)
const OWM_ONE_CALL = (lat, lon) =>
  `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&units=imperial&appid=${API_KEY}`;
// --------------------

const $ = sel => document.querySelector(sel);
const app = document.getElementById('app');
const refreshBtn = document.getElementById('refresh');

async function init(){
  try {
    // Try browser geolocation
    const pos = await getPosition();
    const {latitude, longitude} = pos.coords;
    fetchAndRender(latitude, longitude);
  } catch (err) {
    // If geolocation denied or unavailable, fall back to prompt
    const city = prompt("I couldn't detect your location. Type your city (e.g. New York):");
    if (city) {
      // Use simple Geocoding via OpenWeather (lat/lon from city). We'll call OWM geocoding.
      try {
        const g = await fetchGeoFromCity(city);
        if (g) {
          fetchAndRender(g.lat, g.lon, g.name);
        } else {
          showError("Couldn't find that city.");
        }
      } catch (e) {
        showError("Error fetching city location.");
      }
    } else {
      showError("No location provided.");
    }
  }
}

function showError(msg){
  $('#location').textContent = msg;
  $('#temp').textContent = "--°";
  $('#condition').textContent = "—";
  app.className = "";
}

// get browser position as Promise
function getPosition(options = {enableHighAccuracy: false, timeout: 8000}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("No geolocation"));
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function fetchGeoFromCity(city){
  const q = encodeURIComponent(city);
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${q}&limit=1&appid=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data && data.length) {
    return { lat: data[0].lat, lon: data[0].lon, name: data[0].name };
  }
  return null;
}

async function fetchAndRender(lat, lon, fallbackName){
  try {
    app.classList.remove('loading');
    $('#location').textContent = 'Loading weather...';
    const resp = await fetch(OWM_ONE_CALL(lat, lon));
    if (!resp.ok) throw new Error("Weather fetch failed");
    const json = await resp.json();
    renderAll(json, lat, lon, fallbackName);
  } catch (err) {
    console.error(err);
    showError("Failed to load weather.");
  }
}

function renderAll(data, lat, lon, fallbackName){
  // Basic fields
  const current = data.current;
  const hourly = data.hourly || [];
  const daily = data.daily || [];

  // Location name attempt: use reverse geocode (OpenWeather) or fallback to provided name.
  reverseGeocode(lat, lon).then(name => {
    $('#location').textContent = name || fallbackName || 'Your location';
  }).catch(_ => {
    $('#location').textContent = fallbackName || 'Your location';
  });

  // display current
  const temp = Math.round(current.temp);
  $('#temp').textContent = `${temp}°`;
  $('#condition').textContent = capitalize(current.weather[0].description);

  // set background / icon
  const main = current.weather[0].main.toLowerCase();
  applyMood(main, current);

  // icon element (cartoony)
  drawIcon(main, current);

  // hourly list — show next 8 hours
  renderHourly(hourly.slice(0, 8));

  // simple tomorrow prediction using the daily array or comparing hourly trends
  const tomorrow = daily[1];
  const tomorrowPred = simplePredict(current, hourly, tomorrow);
  $('#tomorrowPrediction').textContent = tomorrowPred.text;
  $('#tomorrowHighLow').textContent = `H ${Math.round(tomorrow.temp.max)}° • L ${Math.round(tomorrow.temp.min)}°`;

  // last updated
  $('#updatedAt').textContent = new Date(current.dt * 1000).toLocaleTimeString();

  // small accessibility tweak
  app.setAttribute('data-mood', main);
}

function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1) }

// simple reverse geocode using OpenWeather (free)
async function reverseGeocode(lat, lon){
  const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const json = await resp.json();
  if (json && json.length) {
    const name = json[0].name;
    const state = json[0].state ? (", " + json[0].state) : "";
    const country = json[0].country ? (", " + json[0].country) : "";
    return `${name}${state}${country}`;
  }
  return null;
}

function applyMood(main, current){
  // remove all; then add one
  app.className = '';
  if (main.includes('cloud')) {
    app.classList.add('cloudy');
  } else if (main.includes('rain') || main.includes('drizzle')) {
    app.classList.add('rainy');
  } else if (main.includes('thunder') || main.includes('storm')) {
    app.classList.add('stormy');
  } else {
    // sunny (clear) or default
    const hour = new Date(current.dt * 1000).getHours();
    if (hour < 6 || hour >= 19) app.classList.add('night');
    else app.classList.add('sunny');
  }
}

function drawIcon(main, current){
  const iconEl = $('#icon');
  iconEl.innerHTML = ""; // clear
  if (main.includes('cloud')) {
    const cloud = document.createElement('div'); cloud.className = 'cloud';
    iconEl.appendChild(cloud);
  } else if (main.includes('rain') || main.includes('drizzle')) {
    const cloud = document.createElement('div'); cloud.className='cloud';
    const rain = document.createElement('div'); rain.className='rain';
    iconEl.appendChild(cloud); iconEl.appendChild(rain);
  } else if (main.includes('thunder') || main.includes('storm')) {
    const cloud = document.createElement('div'); cloud.className='cloud';
    const bolt = document.createElement('div'); bolt.style.cssText = 'width:24px;height:44px;background:linear-gradient(180deg,#ffec7a,#ffb84d);transform:skewX(-10deg);position:absolute;left:44px;top:40px;border-radius:6px';
    iconEl.appendChild(cloud); iconEl.appendChild(bolt);
  } else {
    const sun = document.createElement('div'); sun.className = 'sun';
    iconEl.appendChild(sun);
  }
}

// render hourly small cards
function renderHourly(items){
  const container = $('#hourlyList');
  container.innerHTML = '';
  items.forEach(h => {
    const d = new Date(h.dt * 1000);
    const hr = d.getHours();
    const label = hr === new Date().getHours() ? 'Now' : (hr % 12 === 0 ? '12' : hr % 12) + (hr < 12 ? 'a' : 'p');
    const temp = Math.round(h.temp);
    const it = document.createElement('div'); it.className = 'hourly-item';
    it.innerHTML = `<div class="hour">${label}</div>
                    <div class="small-icon">${smallIconFor(h.weather[0].main)}</div>
                    <div class="t">${temp}°</div>`;
    container.appendChild(it);
  });
}

// small icon html (text/emoji for now — can replace with SVG)
function smallIconFor(main) {
  main = main.toLowerCase();
  if (main.includes('cloud')) return '☁️';
  if (main.includes('rain')|| main.includes('drizzle')) return '🌧️';
  if (main.includes('thunder')|| main.includes('storm')) return '⛈️';
  if (main.includes('snow')) return '🌨️';
  return '☀️';
}

// A small rule-based predictor for tomorrow (very simple)
function simplePredict(current, hourly, tomorrow){
  // If tomorrow's precipitation probability (pop) > 0.4 -> rainy
  if (tomorrow && tomorrow.pop > 0.4) {
    return { text: 'Likely precipitation — take an umbrella' };
  }
  // If many of the next 8 hours have rain pop -> likely showers
  const rainHours = hourly.slice(0,8).filter(h=>h.pop && h.pop > 0.4).length;
  if (rainHours >= 2) return { text: 'Chance of showers tonight — tomorrow might be cloudy' };

  // If temperature trending down strongly -> cooler tomorrow
  const nowTemp = current.temp;
  const avgNext = hourly.slice(0,8).reduce((s,h)=>s+h.temp,0)/Math.max(1,Math.min(8,hourly.length));
  if (avgNext < nowTemp - 4) return { text: 'Cooling trend — cooler tomorrow' };
  if (avgNext > nowTemp + 4) return { text: 'Warming trend — warmer tomorrow' };

  // Otherwise: similar
  return { text: 'Similar conditions expected tomorrow' };
}

// refresh handler
refreshBtn.addEventListener('click', async ()=>{
  try {
    const pos = await getPosition();
    fetchAndRender(pos.coords.latitude, pos.coords.longitude);
  } catch(e) {
    alert("Couldn't fetch location to refresh. Try reloading the page.");
  }
});

// initial run
init();
