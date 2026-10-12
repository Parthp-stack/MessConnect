// Geolocation & Reverse Geocoding Utility for MessConnect
// Resolves locations locally using device GPS and campus clusters.
// ZERO external website network requests (no Nominatim, no external website scrapers).

export const KNOWN_CAMPUS_AREAS = [
  { area: "Alandi", city: "Pune", pincode: "412105", lat: 18.6756, lng: 73.8967, landmark: "MIT Academy of Engineering (MITAOE Flagship Campus)", isFlagship: true },
  { area: "Moshi", city: "Pune", pincode: "412105", lat: 18.6780, lng: 73.8430, landmark: "Near Alandi Engineering Cluster / Moshi" },
  { area: "Ravet", city: "Pune", pincode: "412101", lat: 18.6534, lng: 73.7431, landmark: "Near PCCOE & D.Y. Patil Campus" },
  { area: "Bhosari", city: "Pune", pincode: "411039", lat: 18.6258, lng: 73.8488, landmark: "Near Alandi Road / Dighi Link" },
  { area: "Kothrud", city: "Pune", pincode: "411038", lat: 18.5074, lng: 73.8077, landmark: "Near MIT World Peace / Bharati Vidyapeeth" },
  { area: "Karve Nagar", city: "Pune", pincode: "411052", lat: 18.4913, lng: 73.8219, landmark: "Near Cummins / MMCOE" },
  { area: "FC Road", city: "Pune", pincode: "411004", lat: 18.5284, lng: 73.8415, landmark: "Near Fergusson / BMCC / COEP" },
  { area: "Shivajinagar", city: "Pune", pincode: "411005", lat: 18.5314, lng: 73.8446, landmark: "Near COEP Technological University" },
  { area: "Viman Nagar", city: "Pune", pincode: "411014", lat: 18.5679, lng: 73.9143, landmark: "Near Symbiosis Campus" },
  { area: "Hinjawadi", city: "Pune", pincode: "411057", lat: 18.5913, lng: 73.7389, landmark: "Phase 1 / Infosys Circle" },
  { area: "Aundh", city: "Pune", pincode: "411007", lat: 18.5580, lng: 73.8075, landmark: "Near University Gate" },
  { area: "Wakad", city: "Pune", pincode: "411033", lat: 18.5987, lng: 73.7688, landmark: "Dange Chowk / JSPM" },
  { area: "Sadashiv Peth", city: "Pune", pincode: "411030", lat: 18.5117, lng: 73.8524, landmark: "Near SP College / Tilak Road" },
  { area: "Baner", city: "Pune", pincode: "411045", lat: 18.5590, lng: 73.7868, landmark: "Balewadi High Street" },
  { area: "Pimpri-Chinchwad", city: "Pune", pincode: "411018", lat: 18.6298, lng: 73.7997, landmark: "Near PCCOE Campus" },
  { area: "Katraj", city: "Pune", pincode: "411046", lat: 18.4575, lng: 73.8677, landmark: "Near Bharati Vidyapeeth Campus" },
  { area: "Hadapsar", city: "Pune", pincode: "411028", lat: 18.5089, lng: 73.9259, landmark: "Magarpatta / Nobel Hospital" },
  { area: "Wagholi", city: "Pune", pincode: "412207", lat: 18.5808, lng: 73.9787, landmark: "Near JSPM Imperial Campus" }
];

/**
 * Calculate distance in km between two lat/lng points using Haversine formula
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Find the closest registered campus cluster from GPS coordinates
 */
export function findNearestCampusArea(lat, lng) {
  let closest = null;
  let minDistance = Infinity;

  for (const item of KNOWN_CAMPUS_AREAS) {
    const dist = calculateDistanceKm(lat, lng, item.lat, item.lng);
    if (dist != null && dist < minDistance) {
      minDistance = dist;
      closest = item;
    }
  }

  if (closest && minDistance <= 45) {
    return {
      ...closest,
      distanceKm: Math.round(minDistance * 10) / 10
    };
  }

  return null;
}

function isValidAreaName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  // Never allow IP-like or coordinate-like strings
  if (/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(trimmed)) return false;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return false;
  if (/^[0-9\s,.-]+$/.test(trimmed)) return false;
  if (trimmed.toLowerCase().includes('gps location')) return false;
  return true;
}

/**
 * Master Location Resolver:
 * Accepts optional coordinates from GPS.
 * Resolves completely locally without querying external websites.
 * Guarantees a clean, human-readable name (e.g. "Kothrud, Pune", "Alandi, Pune").
 * Never returns raw coordinates or IP address!
 */
export async function detectCurrentLocation(providedCoords = null) {
  let lat = providedCoords?.latitude;
  let lng = providedCoords?.longitude;
  const sourceMethod = (lat != null && lng != null) ? 'GPS' : 'MANUAL';

  if (lat == null || lng == null) {
    lat = 18.6756;
    lng = 73.8967;
  }

  // Calculate nearest campus cluster using local geospatial database
  const nearest = findNearestCampusArea(lat, lng);
  if (nearest) {
    return {
      method: sourceMethod,
      area: nearest.area,
      city: nearest.city,
      pincode: nearest.pincode,
      label: `${nearest.area}, ${nearest.city}`,
      coords: { lat, lng },
      landmark: nearest.landmark,
      nearestCampus: nearest
    };
  }

  // Default campus (MITAOE Alandi Flagship)
  return {
    method: sourceMethod,
    area: 'Alandi',
    city: 'Pune',
    pincode: '412105',
    label: 'Alandi (MITAOE), Pune',
    coords: { lat: 18.6756, lng: 73.8967 },
    landmark: 'MIT Academy of Engineering (MITAOE Campus)',
    nearestCampus: KNOWN_CAMPUS_AREAS[0]
  };
}

/**
 * Universal Local Live Location Fetcher
 * Used across Student (Discovery/Passes) and Mess Owner (Kitchen Location/Signup)
 * Requests real device GPS, resolves locality locally with zero external network requests.
 */
export async function fetchLiveLocationZomatoStyle() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      detectCurrentLocation(null).then(resolve).catch(reject);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const resolved = await detectCurrentLocation({ latitude, longitude });
          resolve({
            ...resolved,
            method: 'GPS',
            coords: { lat: latitude, lng: longitude }
          });
        } catch (err) {
          const fallback = await detectCurrentLocation(null);
          resolve(fallback);
        }
      },
      async (error) => {
        try {
          const fallback = await detectCurrentLocation(null);
          resolve(fallback);
        } catch (err) {
          reject(err);
        }
      },
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 30000 }
    );
  });
}

// Backward-compatibility alias
export const reverseGeocodeCoords = async (lat, lng) => detectCurrentLocation({ latitude: lat, longitude: lng });
