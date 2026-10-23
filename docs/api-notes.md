# Open-Meteo API notes

## Geocoding

Endpoint: `https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1`

For Pune, the response's first result provides the city name, country, latitude,
and longitude. These coordinates are passed to the forecast endpoint.

Fields used:

- `results[0].name` -> `city`
- `results[0].country` -> `country`
- `results[0].latitude` -> forecast request latitude
- `results[0].longitude` -> forecast request longitude

Trimmed response:

```json
{
  "results": [
    {
      "name": "Pune",
      "latitude": 18.51957,
      "longitude": 73.85535,
      "country": "India"
    }
  ]
}
```

## Current weather

Endpoint:
`https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`

Fields used from `current`:

- `temperature_2m` (°C) -> `temperature_c`
- `relative_humidity_2m` (%) -> `humidity`
- `wind_speed_10m` (km/h) -> `wind_kmh`
- `weather_code` -> `weather_code` and its text description -> `condition`
- Top-level `latitude` and `longitude` -> coordinates returned for the forecast

For weather code `2`, the stored condition text is `Partly cloudy`.

Trimmed response:

```json
{
  "latitude": 18.523726,
  "longitude": 73.86876,
  "current_units": {
    "temperature_2m": "°C",
    "relative_humidity_2m": "%",
    "wind_speed_10m": "km/h",
    "weather_code": "wmo code"
  },
  "current": {
    "time": "2026-10-23T10:45",
    "temperature_2m": 32.0,
    "relative_humidity_2m": 35,
    "wind_speed_10m": 9.4,
    "weather_code": 2
  }
}
```
