import { createProject, getActiveProject } from '../utils/projects.js';

/**
 * Si existe config en el formato viejo (clave 'ensayos_config'),
 * la migra al nuevo sistema de proyectos y borra la clave vieja.
 * Se llama una sola vez en App.jsx al montar.
 */
export function migrateOldConfig() {
  const OLD_KEY = 'ensayos_config';
  const raw = localStorage.getItem(OLD_KEY);
  if (!raw) return;

  if (getActiveProject()) {
    localStorage.removeItem(OLD_KEY);
    return;
  }

  try {
    const oldConfig = JSON.parse(raw);
    createProject({
      client: 'Proyecto importado',
      execution: 'Configuración anterior',
      config: oldConfig,
    });
    localStorage.removeItem(OLD_KEY);
    console.info('[Migration] Config anterior migrada al nuevo sistema de proyectos.');
  } catch {
    console.warn('[Migration] No se pudo migrar la config anterior.');
  }
}

export const STORAGE_KEYS = {
  CONFIG:          'ensayos_config',
  ROOMS_CACHE:     'ensayos_rooms_cache',
  EQUIPMENT_CACHE: 'ensayos_equipment_cache',
  CACHE_TIME:      'ensayos_cache_time',
  GOOGLE_API_KEY:  'ensayos_google_api_key', // persiste entre reconfigs
};

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

export function saveConfig(config) {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
}

export function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearConfig() {
  localStorage.removeItem(STORAGE_KEYS.CONFIG);
}

export function saveCache(rooms, pressures, equipment) {
  localStorage.setItem(STORAGE_KEYS.ROOMS_CACHE,     JSON.stringify({ rooms, pressures }));
  localStorage.setItem(STORAGE_KEYS.EQUIPMENT_CACHE, JSON.stringify(equipment));
  localStorage.setItem(STORAGE_KEYS.CACHE_TIME,      String(Date.now()));
}

export function loadCache() {
  try {
    const cacheTime = parseInt(localStorage.getItem(STORAGE_KEYS.CACHE_TIME) || '0', 10);
    if (Date.now() - cacheTime > CACHE_TTL_MS) return null;

    const roomsRaw     = localStorage.getItem(STORAGE_KEYS.ROOMS_CACHE);
    const equipmentRaw = localStorage.getItem(STORAGE_KEYS.EQUIPMENT_CACHE);
    if (!roomsRaw || !equipmentRaw) return null;

    const { rooms, pressures } = JSON.parse(roomsRaw);
    const equipment = JSON.parse(equipmentRaw);
    return { rooms, pressures, equipment, cachedAt: cacheTime };
  } catch {
    return null;
  }
}

// Google API Key se guarda por separado y NO se borra con clearConfig()
export function saveGoogleApiKey(key) {
  if (key) localStorage.setItem(STORAGE_KEYS.GOOGLE_API_KEY, key);
  else localStorage.removeItem(STORAGE_KEYS.GOOGLE_API_KEY);
}

export function loadGoogleApiKey() {
  return localStorage.getItem(STORAGE_KEYS.GOOGLE_API_KEY) || null;
}

export function clearCache() {
  localStorage.removeItem(STORAGE_KEYS.ROOMS_CACHE);
  localStorage.removeItem(STORAGE_KEYS.EQUIPMENT_CACHE);
  localStorage.removeItem(STORAGE_KEYS.CACHE_TIME);
}

export function isCacheValid() {
  const cacheTime = parseInt(localStorage.getItem(STORAGE_KEYS.CACHE_TIME) || '0', 10);
  return Date.now() - cacheTime <= CACHE_TTL_MS;
}
