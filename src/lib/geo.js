/**
 * Geographic search and distance utilities.
 */

const KNOWN_CITY_COORDINATES = {
  delhi: [77.209, 28.6139],
  "new delhi": [77.209, 28.6139],
  mumbai: [72.8777, 19.076],
  bengaluru: [77.5946, 12.9716],
  bangalore: [77.5946, 12.9716],
  hyderabad: [78.4867, 17.385],
  chennai: [80.2707, 13.0827],
  kolkata: [88.3639, 22.5726],
  pune: [73.8567, 18.5204],
  ahmedabad: [72.5714, 23.0225],
  jaipur: [75.7873, 26.9124],
};

/**
 * Calculates Great Circle (Haversine) distance in kilometers between two points.
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;

  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Resolves fallback coordinates from city or area string for backfilling.
 */
export function resolveCityCoordinates(cityOrAddress) {
  if (!cityOrAddress || typeof cityOrAddress !== "string") return null;
  const normalized = cityOrAddress.toLowerCase().trim();

  for (const [cityName, coords] of Object.entries(KNOWN_CITY_COORDINATES)) {
    if (normalized.includes(cityName)) {
      return coords; // [lng, lat]
    }
  }

  // Default central fallback if city is unknown: New Delhi coordinates
  return [77.209, 28.6139];
}

/**
 * Validates latitude and longitude ranges.
 */
export function isValidCoordinate(lng, lat) {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}
