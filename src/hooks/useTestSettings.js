import { useState, useEffect } from 'react';
import { DEFAULT_SETTINGS } from '../utils/completionPct.js';

const STORAGE_KEY = 'testSettings_v1';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function useTestSettings() {
  const [settings, setSettings] = useState(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  function update(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  return { settings, update };
}
