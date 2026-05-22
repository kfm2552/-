// Weather API Configuration
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const currentWeatherSection = document.getElementById('currentWeather');
const hourlyForecastSection = document.getElementById('hourlyForecast');
const dailyForecastSection = document.getElementById('dailyForecast');
const recentSearchesSection = document.getElementById('recentSearches');

// Event Listeners
searchBtn.addEventListener('click', () => searchWeather());
locationBtn.addEventListener('click', () => getLocationWeather());
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchWeather();
});

// Search for city
async function searchWeather() {
    const city = searchInput.value.trim();
    if (!city) {
        showError('Please enter a city name');
        return;
    }

    try {
        const coordinates = await getCoordinates(city);
        if (!coordinates) {
            showError(`City "${city}" not found`);
            return;
        }

        await getWeatherData(coordinates.lat, coordinates.lon, city);
        addToSearchHistory(city);
        searchInput.value = '';
    } catch (error) {
        showError('Failed to fetch weather data');
        console.error(error);
    }
}

// Get coordinates from city name
async function getCoordinates(city) {
    try {
        const response = await fetch(`${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            return {
                lat: result.latitude,
                lon: result.longitude,
                city: result.name,
                country: result.country
            };
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

// Get weather data
async function getWeatherData(lat, lon, cityName) {
    showLoading(true);
    hideError();

    try {
        const response = await fetch(
            `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,apparent_temperature,pressure_msl,wind_speed_10m,visibility&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
        );

        if (!response.ok) throw new Error('Weather API error');

        const data = await response.json();
        displayWeather(data, cityName, lat, lon);
    } catch (error) {
        showError('Failed to fetch weather data');
        console.error(error);
    } finally {
        showLoading(false);
    }
}

// Display current weather
function displayWeather(data, cityName, lat, lon) {
    const current = data.current;
    const hourly = data.hourly;
    const daily = data.daily;

    // Display current weather
    displayCurrentWeather(current, cityName);

    // Display hourly forecast (next 24 hours)
    displayHourlyForecast(hourly, daily);

    // Display daily forecast
    displayDailyForecast(daily);

    currentWeatherSection.classList.remove('hidden');
    hourlyForecastSection.classList.remove('hidden');
    dailyForecastSection.classList.remove('hidden');
}

// Display current weather details
function displayCurrentWeather(current, cityName) {
    const weatherCode = current.weather_code;
    const description = getWeatherDescription(weatherCode);
    const date = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
    });

    document.getElementById('cityName').textContent = cityName;
    document.getElementById('date').textContent = date;
    document.getElementById('temperature').textContent = `${Math.round(current.temperature_2m)}°C`;
    document.getElementById('description').textContent = description;
    document.getElementById('weatherIcon').textContent = getWeatherEmoji(description);
    document.getElementById('feelsLike').textContent = `${Math.round(current.apparent_temperature)}°C`;
    document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    document.getElementById('pressure').textContent = `${Math.round(current.pressure_msl)} mb`;
    document.getElementById('visibility').textContent = `${Math.round(current.visibility / 1000)} km`;
}

// Display hourly forecast
function displayHourlyForecast(hourly, daily) {
    const container = document.getElementById('hourlyContainer');
    container.innerHTML = '';

    const now = new Date();
    const currentHour = now.getHours();

    for (let i = 0; i < 24; i++) {
        const time = new Date(now);
        time.setHours(time.getHours() + i);
        
        const hourIndex = time.getHours();
        const dayIndex = Math.floor((now.getTime() - new Date(hourly.time[0]).getTime()) / (24 * 60 * 60 * 1000)) + Math.floor(i / 24);
        const indexInArray = (hourly.time.length / 24) * dayIndex + hourIndex;

        if (indexInArray >= hourly.time.length) break;

        const temp = hourly.temperature_2m[Math.floor(indexInArray)];
        const weatherCode = hourly.weather_code[Math.floor(indexInArray)];
        const description = getWeatherDescription(weatherCode);
        const chanceRain = hourly.precipitation_probability[Math.floor(indexInArray)] || 0;

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="time">${time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
            <div class="icon">${getWeatherEmoji(description)}</div>
            <div class="temp">${Math.round(temp)}°C</div>
            <div class="condition">${description}</div>
            <div class="chance-rain">💧 ${chanceRain}%</div>
        `;
        container.appendChild(card);
    }
}

// Display daily forecast
function displayDailyForecast(daily) {
    const container = document.getElementById('dailyContainer');
    container.innerHTML = '';

    for (let i = 0; i < Math.min(7, daily.time.length); i++) {
        const date = new Date(daily.time[i]);
        const maxTemp = daily.temperature_2m_max[i];
        const minTemp = daily.temperature_2m_min[i];
        const weatherCode = daily.weather_code[i];
        const description = getWeatherDescription(weatherCode);
        const chanceRain = daily.precipitation_probability_max[i] || 0;

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="time">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <div class="icon">${getWeatherEmoji(description)}</div>
            <div class="temp">${Math.round(maxTemp)}°/${Math.round(minTemp)}°</div>
            <div class="condition">${description}</div>
            <div class="chance-rain">💧 ${chanceRain}%</div>
        `;
        container.appendChild(card);
    }
}

// Get weather description from WMO code
function getWeatherDescription(code) {
    const descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Foggy',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with hail',
        99: 'Thunderstorm with hail'
    };
    return descriptions[code] || 'Unknown';
}

// Get weather emoji
function getWeatherEmoji(description) {
    const desc = description.toLowerCase();
    if (desc.includes('clear')) return '☀️';
    if (desc.includes('cloud')) return '☁️';
    if (desc.includes('rain') || desc.includes('drizzle') || desc.includes('shower')) return '🌧️';
    if (desc.includes('thunderstorm')) return '⛈️';
    if (desc.includes('snow')) return '❄️';
    if (desc.includes('fog')) return '🌫️';
    return '🌡️';
}

// Get user's location
function getLocationWeather() {
    if (navigator.geolocation) {
        showLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                getWeatherData(latitude, longitude, 'Your Location');
                showLoading(false);
            },
            (error) => {
                showError('Unable to get your location');
                showLoading(false);
            }
        );
    } else {
        showError('Geolocation not supported');
    }
}

// Search history management
function addToSearchHistory(city) {
    let history = JSON.parse(localStorage.getItem('weatherHistory') || '[]');
    history = history.filter(c => c.toLowerCase() !== city.toLowerCase());
    history.unshift(city);
    history = history.slice(0, 10);
    localStorage.setItem('weatherHistory', JSON.stringify(history));
    displaySearchHistory();
}

function displaySearchHistory() {
    const history = JSON.parse(localStorage.getItem('weatherHistory') || '[]');
    if (history.length === 0) {
        recentSearchesSection.classList.add('hidden');
        return;
    }

    const container = document.getElementById('searchHistory');
    container.innerHTML = '';
    history.forEach(city => {
        const btn = document.createElement('button');
        btn.textContent = city;
        btn.addEventListener('click', () => {
            searchInput.value = city;
            searchWeather();
        });
        container.appendChild(btn);
    });
    recentSearchesSection.classList.remove('hidden');
}

// UI Helper functions
function showLoading(show) {
    loadingSpinner.classList.toggle('hidden', !show);
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    setTimeout(() => hideError(), 5000);
}

function hideError() {
    errorMessage.classList.add('hidden');
}

// Initialize
displaySearchHistory();
