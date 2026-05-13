import { useState, useCallback, useRef } from 'react';
import { fetchSheetAsCsv, parseCsv } from '../utils/googleSheets.js';
import { parseFlujos } from '../parsers/flujos.js';
import { loadCache, saveCache, isCacheValid } from '../config/storage.js';

export function useEquipmentData() {
  const [equipment, setEquipment] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const genRef = useRef(0);

  const clearData = useCallback(() => {
    genRef.current += 1;
    setEquipment([]);
    setError(null);
  }, []);

  const loadData = useCallback(async (config, force = false) => {
    if (!config?.equipResultsSheetId || !config?.equipResultsGid || !config?.equipDataSheetId || !config?.equipDataGid) {
      console.log('[useEquipmentData] Config de equipos incompleta, saltando fetch.');
      return;
    }

    // Limpia el estado anterior antes de cargar datos nuevos
    setEquipment([]);

    console.log('[useEquipmentData] Iniciando carga. force=', force);

    if (!force && isCacheValid()) {
      const cached = loadCache();
      if (cached?.equipment?.length) {
        console.log('[useEquipmentData] Usando caché:', cached.equipment.length, 'equipos');
        setEquipment(cached.equipment);
        return;
      }
    }

    const gen = ++genRef.current;
    setLoading(true);
    setError(null);
    try {
      console.log('[useEquipmentData] Fetching sheets...');
      const [dataCsv, resultadosCsv] = await Promise.all([
        fetchSheetAsCsv(config.equipDataSheetId,    config.equipDataGid),
        fetchSheetAsCsv(config.equipResultsSheetId, config.equipResultsGid),
      ]);

      console.log('[useEquipmentData] CSV recibidos, parseando...');
      const { equipment } = parseFlujos(parseCsv(dataCsv), parseCsv(resultadosCsv));

      if (gen !== genRef.current) {
        console.log('[useEquipmentData] Fetch obsoleto, descartando.');
        return;
      }

      console.log('[useEquipmentData] Parseado:', equipment.length, 'equipos');
      setEquipment(equipment);

      const cached = loadCache();
      saveCache(cached?.rooms ?? [], cached?.pressures ?? [], equipment);
    } catch (err) {
      if (gen !== genRef.current) return;
      console.error('[useEquipmentData] Error:', err);
      setError(err.message);
    } finally {
      if (gen === genRef.current) setLoading(false);
    }
  }, []);

  return { equipment, loading, error, loadData, clearData };
}
