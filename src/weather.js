const geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';
const forecastUrl = 'https://api.open-meteo.com/v1/forecast';

// Convert Open-Meteo WMO weather codes into short readable conditions.
export function mapWeatherCode(code) {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if ([51, 53, 55].includes(code)) return 'Drizzle';
  if ([56, 57, 66, 67].includes(code)) return 'Freezing precipitation';
  if ([61, 63, 65, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Unknown';
}

// Fetch JSON with friendly network, timeout, and HTTP error messages.
async function fetchJson(url, endpointName) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error(`${endpointName} request timed out.`);
    }
    throw new Error(`${endpointName} request failed. Check your network connection.`);
  }

  if (!response.ok) {
    throw new Error(`${endpointName} returned HTTP ${response.status}.`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`${endpointName} returned an invalid response.`);
  }
}

// Resolve a city name to its first Open-Meteo geocoding result.
async function geocodeCity(city) {
  const url = new URL(geocodingUrl);
  url.searchParams.set('name', city);
  url.searchParams.set('count', '1');
  const data = await fetchJson(url, 'Geocoding');
  const location = data.results?.[0];

  if (!location) {
    throw new Error(`No matching city found for "${city}". Check the spelling and try again.`);
  }
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    throw new Error('Geocoding did not return valid coordinates for that city.');
  }

  return location;
}

// Fetch current weather for the supplied coordinates.
async function fetchCurrentWeather(latitude, longitude) {
  const url = new URL(forecastUrl);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
  );
  const data = await fetchJson(url, 'Weather');
  const current = data.current;

  if (
    !current
    || !Number.isFinite(current.temperature_2m)
    || !Number.isFinite(current.relative_humidity_2m)
    || !Number.isFinite(current.wind_speed_10m)
    || !Number.isInteger(current.weather_code)
  ) {
    throw new Error('Weather service returned incomplete current conditions.');
  }

  return current;
}

// Combine geocoding and current conditions into a database-ready record.
export async function getCurrentWeather(city) {
  const location = await geocodeCity(city);
  const current = await fetchCurrentWeather(location.latitude, location.longitude);

  return {
    city: location.name,
    country: location.country ?? null,
    latitude: location.latitude,
    longitude: location.longitude,
    temperature_c: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    wind_kmh: current.wind_speed_10m,
    condition: mapWeatherCode(current.weather_code),
    weather_code: current.weather_code,
  };
}
