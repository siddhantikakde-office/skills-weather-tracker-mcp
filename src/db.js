import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';

const databasePath = fileURLToPath(new URL('../weather.db', import.meta.url));
const db = new Database(databasePath);

// Save one current weather observation.
export function insertWeatherLog(weather) {
  const insert = db.prepare(`
    INSERT INTO weather_logs (
      city, country, latitude, longitude, temperature_c,
      humidity, wind_kmh, condition, weather_code
    ) VALUES (
      @city, @country, @latitude, @longitude, @temperature_c,
      @humidity, @wind_kmh, @condition, @weather_code
    )
  `);

  return insert.run(weather).lastInsertRowid;
}

// Return the newest weather observations, respecting the requested limit.
export function listWeatherLogs(limit) {
  return db.prepare(`
    SELECT city, country, temperature_c, humidity, wind_kmh, condition, created_at
    FROM weather_logs
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(limit);
}

// Calculate temperature statistics for a city, ignoring letter case.
export function getCityStats(city) {
  return db.prepare(`
    SELECT
      COUNT(*) AS count,
      MIN(temperature_c) AS min_temperature,
      MAX(temperature_c) AS max_temperature,
      AVG(temperature_c) AS average_temperature
    FROM weather_logs
    WHERE city = ? COLLATE NOCASE
  `).get(city);
}
