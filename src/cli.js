import { getCityStats, insertWeatherLog, listWeatherLogs } from './db.js';
import { getCurrentWeather } from './weather.js';

const usage = `Usage:
  node src/cli.js add "<city>"
  node src/cli.js list [--limit N]
  node src/cli.js stats "<city>"`;

// Format rows as a readable plain-text table.
function printTable(rows, columns) {
  const widths = columns.map(({ heading, key }) => (
    Math.max(heading.length, ...rows.map((row) => String(row[key] ?? '').length))
  ));
  const formatRow = (values) => values
    .map((value, index) => String(value ?? '').padEnd(widths[index]))
    .join(' | ');
  const headings = columns.map(({ heading }) => heading);

  console.log(formatRow(headings));
  console.log(widths.map((width) => '-'.repeat(width)).join('-+-'));
  for (const row of rows) {
    console.log(formatRow(columns.map(({ key }) => row[key])));
  }
}

// Parse and validate the optional list row limit.
function parseListLimit(args) {
  if (args.length === 0) return 10;
  if (args.length !== 2 || args[0] !== '--limit') {
    throw new Error(`Invalid list options.\n${usage}`);
  }

  const limit = Number(args[1]);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('The --limit value must be a positive whole number.');
  }
  return limit;
}

// Retrieve live weather and persist it as a log.
async function addCity(args) {
  const city = args.join(' ').trim();
  if (!city) throw new Error(`Please provide a city.\n${usage}`);

  const weather = await getCurrentWeather(city);
  const id = insertWeatherLog(weather);
  console.log(
    `Saved weather for ${weather.city}, ${weather.country ?? 'unknown country'}: `
      + `${weather.temperature_c}°C, ${weather.condition} (log #${id}).`,
  );
}

// Display the most recent logs in a compact table.
function showLogs(args) {
  const limit = parseListLimit(args);
  const rows = listWeatherLogs(limit);
  if (rows.length === 0) {
    console.log('No weather logs yet. Add a city to start tracking weather.');
    return;
  }

  printTable(rows, [
    { key: 'city', heading: 'City' },
    { key: 'country', heading: 'Country' },
    { key: 'temperature_c', heading: 'Temp °C' },
    { key: 'humidity', heading: 'Humidity %' },
    { key: 'wind_kmh', heading: 'Wind km/h' },
    { key: 'condition', heading: 'Condition' },
    { key: 'created_at', heading: 'Logged at' },
  ]);
}

// Display minimum, maximum, and average temperatures for a city.
function showStats(args) {
  const city = args.join(' ').trim();
  if (!city) throw new Error(`Please provide a city.\n${usage}`);

  const stats = getCityStats(city);
  if (stats.count === 0) {
    console.log(`No weather logs found for "${city}".`);
    return;
  }

  console.log(`Temperature statistics for ${city}:`);
  console.log(`  Logs: ${stats.count}`);
  console.log(`  Min:  ${stats.min_temperature.toFixed(1)}°C`);
  console.log(`  Max:  ${stats.max_temperature.toFixed(1)}°C`);
  console.log(`  Avg:  ${stats.average_temperature.toFixed(1)}°C`);
}

// Dispatch the requested CLI command.
async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'add') return addCity(args);
  if (command === 'list') return showLogs(args);
  if (command === 'stats') return showStats(args);
  throw new Error(usage);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
