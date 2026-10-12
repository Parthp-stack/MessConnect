import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { storage } from '../services/storage';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [messes, setMesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter State
  const [filters, setFilters] = useState({
    search: '',
    area: '',
    city: 'Pune',
    isPureVeg: false,
    maxPrice: '',
    minRating: '',
    trialAvailable: false,
    meal: '',
    sort: 'popular'
  });

  // Location Sanitizer: Guarantees NO IP addresses, raw coordinates, or legacy placeholders ever display
  const sanitizeLocation = (loc) => {
    const defaultLocation = {
      method: 'MANUAL',
      area: 'Alandi',
      city: 'Pune',
      pincode: '412105',
      label: 'Alandi (MITAOE), Pune',
      coords: { lat: 18.6756, lng: 73.8967 }
    };

    if (!loc || typeof loc !== 'object') return defaultLocation;

    const label = String(loc.label || '');
    const area = String(loc.area || '');

    // Check if label or area contains IP address pattern e.g. 192.168.1.1 or coordinates
    const hasIp = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(label) || /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(area);
    const hasCoords = /\d+\.\d+.*,\s*\d+\.\d+/.test(label) || label.toLowerCase().includes('gps location');
    const hasPlaceholder = area === 'Nearby Campus GPS' || label.length < 3 || area.length < 2;

    if (hasIp || hasCoords || hasPlaceholder) {
      try {
        storage.setPreference('user_location', defaultLocation);
      } catch {}
      return defaultLocation;
    }

    return loc;
  };

  // Location State (Section 8)
  const [userLocation, setUserLocation] = useState(() => {
    const saved = storage.getPreference('user_location', null);
    return sanitizeLocation(saved);
  });

  // Favorites (Section 25)
  const [favorites, setFavorites] = useState(() => {
    const saved = storage.getPreference('favorites', []);
    return Array.isArray(saved) ? saved.filter(id => id !== 'mess_1' && id !== 'mess_5' && id !== 'mess_alandi_1') : [];
  });

  // Offline Simulator & Detection (Section 5)
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isUsingOfflineCache, setIsUsingOfflineCache] = useState(false);

  // Active Mess Details Modal
  const [selectedMessId, setSelectedMessId] = useState(null);

  // Fetch Messes
  const loadMesses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSimulatedOffline) {
        throw new Error('SIMULATED_OFFLINE');
      }

      const res = await api.getMesses(filters);
      if (res && res.messes) {
        setMesses(res.messes);
        setIsUsingOfflineCache(Boolean(res.isOfflineData));
        // Cache to storage
        storage.saveBatch('messes', res.messes);
      }
    } catch (err) {
      console.warn('[AppContext] API Fetch error, reading from local cache:', err);
      const cached = await storage.getAll('messes');
      if (cached && cached.length > 0) {
        // Apply client filters on cached messes
        let filtered = [...cached];
        if (filters.search) {
          const q = filters.search.toLowerCase();
          filtered = filtered.filter(m => m.name.toLowerCase().includes(q) || m.area.toLowerCase().includes(q));
        }
        if (filters.isPureVeg) {
          filtered = filtered.filter(m => m.isPureVeg);
        }
        if (filters.trialAvailable) {
          filtered = filtered.filter(m => m.trialAvailable);
        }
        setMesses(filtered);
        setIsUsingOfflineCache(true);
      } else {
        setError('No cached messes available offline.');
      }
    } finally {
      setLoading(false);
    }
  }, [filters, isSimulatedOffline]);

  useEffect(() => {
    loadMesses();
  }, [loadMesses]);

  // Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      loadMesses();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsUsingOfflineCache(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadMesses]);

  // Toggle Favorite
  const toggleFavorite = async (messId) => {
    const isFav = favorites.includes(messId);
    const updated = isFav ? favorites.filter(id => id !== messId) : [...favorites, messId];
    setFavorites(updated);
    storage.setPreference('favorites', updated);

    // Call API if online
    if (isOnline && !isSimulatedOffline) {
      api.toggleFavorite(messId).catch(() => {});
    }
  };

  // Set Location
  const updateLocation = (newLoc) => {
    const clean = sanitizeLocation(newLoc);
    setUserLocation(clean);
    storage.setPreference('user_location', clean);
    if (clean.area) {
      setFilters(prev => ({
        ...prev,
        area: clean.area,
        city: clean.city || prev.city
      }));
    }
  };

  // Toggle Simulated Offline Mode
  const toggleOfflineSimulation = () => {
    const nextState = !isSimulatedOffline;
    setIsSimulatedOffline(nextState);
    if (nextState) {
      setIsUsingOfflineCache(true);
    } else {
      setIsUsingOfflineCache(false);
      loadMesses();
    }
  };

  return (
    <AppContext.Provider value={{
      messes,
      loading,
      error,
      filters,
      setFilters,
      userLocation,
      updateLocation,
      favorites,
      toggleFavorite,
      selectedMessId,
      setSelectedMessId,
      loadMesses,
      isOnline: isOnline && !isSimulatedOffline,
      isSimulatedOffline,
      isUsingOfflineCache,
      toggleOfflineSimulation
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
