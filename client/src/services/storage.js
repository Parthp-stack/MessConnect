// Client-side Local Storage (Room Database & DataStore Equivalent)
// Uses IndexedDB for structured entity collections and localStorage for quick preferences.

const DB_NAME = 'MessConnect_LocalDB';
const DB_VERSION = 2;
const STORES = ['messes', 'subscriptions', 'trials', 'notifications', 'favorites', 'searchHistory'];

class LocalStorageEngine {
  constructor() {
    this.purgeLegacyData();
    this.db = null;
    this.initPromise = this.initDB();
  }

  purgeLegacyData() {
    if (typeof window === 'undefined') return;
    try {
      const rawMesses = localStorage.getItem('messconnect_local_messes');
      if (rawMesses) {
        const parsed = JSON.parse(rawMesses);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(m =>
            !m.id?.startsWith('mess_demo') &&
            m.id !== 'mess_1' &&
            m.id !== 'mess_2' &&
            m.id !== 'mess_3' &&
            m.id !== 'mess_4' &&
            m.id !== 'mess_5' &&
            m.id !== 'mess_6' &&
            m.id !== 'mess_alandi_1' &&
            !m.name?.includes('Annapurna') &&
            !m.name?.includes('MITAOE Campus Kitchen')
          );
          localStorage.setItem('messconnect_local_messes', JSON.stringify(cleaned));
        }
      }
      const rawSubs = localStorage.getItem('messconnect_local_subscriptions');
      if (rawSubs) {
        const parsed = JSON.parse(rawSubs);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(s => !s.id?.includes('demo') && s.messId !== 'mess_1' && s.messId !== 'mess_alandi_1');
          localStorage.setItem('messconnect_local_subscriptions', JSON.stringify(cleaned));
        }
      }
      const rawFavs = localStorage.getItem('messconnect_pref_favorites');
      if (rawFavs) {
        const parsed = JSON.parse(rawFavs);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(id => id !== 'mess_1' && id !== 'mess_5' && id !== 'mess_alandi_1');
          localStorage.setItem('messconnect_pref_favorites', JSON.stringify(cleaned));
        }
      }
    } catch (e) {}
  }

  async initDB() {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[Storage] IndexedDB not available, fallback to memory/localStorage');
      return null;
    }

    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        STORES.forEach(storeName => {
          if (db.objectStoreNames.contains(storeName)) {
            db.deleteObjectStore(storeName);
          }
          db.createObjectStore(storeName, { keyPath: 'id' });
        });
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('[Storage] IndexedDB initialized successfully (Room equivalent).');
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[Storage] IndexedDB initialization error:', event.target.error);
        resolve(null);
      };
    });
  }

  // --- IndexedDB Operations ---
  async getAll(storeName) {
    await this.initPromise;
    let results = [];
    if (!this.db) {
      results = this.getLocalJSON(storeName) || [];
    } else {
      results = await new Promise((resolve) => {
        try {
          const tx = this.db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => resolve(this.getLocalJSON(storeName) || []);
        } catch (e) {
          resolve(this.getLocalJSON(storeName) || []);
        }
      });
    }

    if (storeName === 'messes' && Array.isArray(results)) {
      return results.filter(m =>
        !m.id?.startsWith('mess_demo') &&
        m.id !== 'mess_1' &&
        m.id !== 'mess_2' &&
        m.id !== 'mess_3' &&
        m.id !== 'mess_4' &&
        m.id !== 'mess_5' &&
        m.id !== 'mess_6' &&
        m.id !== 'mess_alandi_1' &&
        !m.name?.includes('Annapurna') &&
        !m.name?.includes('MITAOE Campus Kitchen')
      );
    }
    return results;
  }

  async saveBatch(storeName, items) {
    await this.initPromise;
    this.setLocalJSON(storeName, items); // Backup to localStorage

    if (!this.db) return;
    try {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear(); // Clear old cached records so deleted/dummy records don't persist
      items.forEach(item => {
        if (item.id) store.put(item);
      });
    } catch (e) {
      console.warn(`[Storage] Failed to batch save to ${storeName}:`, e);
    }
  }

  async put(storeName, item) {
    await this.initPromise;
    if (!this.db) {
      const existing = this.getLocalJSON(storeName) || [];
      const idx = existing.findIndex(i => i.id === item.id);
      if (idx >= 0) existing[idx] = item;
      else existing.push(item);
      this.setLocalJSON(storeName, existing);
      return;
    }

    try {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(item);
    } catch (e) {
      console.warn(`[Storage] Failed to put item in ${storeName}:`, e);
    }
  }

  // --- DataStore Equivalent (Preferences & Lightweight settings) ---
  getPreference(key, defaultValue = null) {
    try {
      const val = localStorage.getItem(`messconnect_pref_${key}`);
      return val !== null ? JSON.parse(val) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  setPreference(key, value) {
    try {
      localStorage.setItem(`messconnect_pref_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('[Storage] Error setting preference:', e);
    }
  }

  getLocalJSON(key) {
    try {
      const raw = localStorage.getItem(`messconnect_cache_${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  setLocalJSON(key, value) {
    try {
      localStorage.setItem(`messconnect_cache_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('[Storage] Error setting cache:', e);
    }
  }

  clearCache() {
    try {
      STORES.forEach(s => {
        localStorage.removeItem(`messconnect_cache_${s}`);
      });
      return true;
    } catch (e) {
      return false;
    }
  }
}

export const storage = new LocalStorageEngine();
