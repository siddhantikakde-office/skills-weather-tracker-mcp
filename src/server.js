import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { getCitySummaries, insertWeatherLog, listWeatherLogs } from './db.js';
import { getCurrentWeather } from './weather.js';

const port = Number(process.env.PORT ?? 3000);
const indexPath = fileURLToPath(new URL('../public/index.html', import.meta.url));

// Send a JSON response with consistent headers.
function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

// Map expected upstream errors to client-facing HTTP status codes.
function statusForError(error) {
  if (error.message.startsWith('No matching city found')) return 404;
  if (/request (failed|timed out)|returned HTTP|returned an invalid response/i.test(error.message)) {
    return 502;
  }
  if (/Weather service returned/.test(error.message)) return 502;
  return 500;
}

// Handle dashboard page, data endpoints, and refresh requests.
async function handleRequest(request, response) {
  const requestUrl = new URL(request.url, 'http://localhost');

  if (request.method === 'GET' && requestUrl.pathname === '/') {
    try {
      const page = await readFile(indexPath);
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(page);
    } catch {
      sendJson(response, 500, { error: 'Dashboard page could not be read.' });
    }
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/logs') {
    try {
      sendJson(response, 200, listWeatherLogs(50));
    } catch {
      sendJson(response, 500, { error: 'Weather logs could not be loaded.' });
    }
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/summary') {
    try {
      sendJson(response, 200, getCitySummaries());
    } catch {
      sendJson(response, 500, { error: 'Weather summaries could not be loaded.' });
    }
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/refresh') {
    const city = requestUrl.searchParams.get('city')?.trim();
    if (!city) {
      sendJson(response, 400, { error: 'Provide a city using ?city=NAME.' });
      return;
    }

    try {
      const weather = await getCurrentWeather(city);
      const id = insertWeatherLog(weather);
      sendJson(response, 201, { id, weather });
    } catch (error) {
      sendJson(response, statusForError(error), { error: error.message });
    }
    return;
  }

  sendJson(response, 404, { error: 'Not found.' });
}

// Start the dashboard HTTP server.
function startServer() {
  const server = createServer((request, response) => {
    handleRequest(request, response).catch(() => {
      if (!response.headersSent) {
        sendJson(response, 500, { error: 'An unexpected server error occurred.' });
      } else {
        response.destroy();
      }
    });
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`Weather dashboard running at http://localhost:${port}`);
  });
}

startServer();
