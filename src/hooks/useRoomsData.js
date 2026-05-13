import { useState, useCallback, useRef } from 'react';
import { fetchSheetAsCsv, parseCsv } from '../utils/googleSheets.js';
import { parseRawData } from '../parsers/rawdata.js';
import { parsePD }      from '../parsers/pd.js';
import { loadCache, saveCache, isCacheValid } from '../config/storage.js';

export function useRoomsData() {
  const [rooms,       setRooms]       = useState([]);
  const [pressures,   setPressures]   = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const genRef = useRef(0);

  const clearData = useCallback(() => {
    genRef.current += 1;
    setRooms([]);
    setPressures([]);
    setError(null);
    setLastUpdated(null);
  }, []);

  const loadData = useCallback(async (config, force = false) => {
    // Soporta dos formatos de config:
    //   Multi-hoja (auto mode): rawDataSheetId + rawDataSheets:[{title,gid}]
    //   Hoja única (manual mode): rawDataSheetId + rawDataGid
    const hasMulti  = config?.rawDataSheets?.length > 0;
    const hasSingle = config?.rawDataSheetId && config?.rawDataGid;

    if (!hasMulti && !hasSingle) {
      console.log('[useRoomsData] Config de salas incompleta, saltando fetch.');
      return;
    }

    // Limpia el estado anterior antes de cargar datos nuevos
    setRooms([]);
    setPressures([]);

    console.log('[useRoomsData] Iniciando carga. force=', force, 'multi=', hasMulti);

    if (!force && isCacheValid()) {
      const cached = loadCache();
      if (cached?.rooms?.length) {
        console.log('[useRoomsData] Usando caché:', cached.rooms.length, 'salas');
        setRooms(cached.rooms);
        setPressures(cached.pressures ?? []);
        setLastUpdated(new Date(cached.cachedAt));
        return;
      }
    }

    const gen = ++genRef.current;
    setLoading(true);
    setError(null);
    try {
      // ── Hojas de datos ───────────────────────────────────────────────────
      let parsedRooms;
      if (hasMulti) {
        console.log('[useRoomsData] Fetcheando', config.rawDataSheets.length, 'hojas de datos...');
        const csvs = await Promise.all(
          config.rawDataSheets.map(s => fetchSheetAsCsv(config.rawDataSheetId, s.gid))
        );
        const allParsed = csvs.flatMap(csv => parseRawData(parseCsv(csv)));
        const deduped = new Map();
        for (const r of allParsed) { if (!deduped.has(r.id)) deduped.set(r.id, r); }
        parsedRooms = Array.from(deduped.values());
        console.log('[useRoomsData] Total salas combinadas:', parsedRooms.length);
      } else {
        const rawCsv = await fetchSheetAsCsv(config.rawDataSheetId, config.rawDataGid);
        parsedRooms  = parseRawData(parseCsv(rawCsv));
        console.log('[useRoomsData] Salas:', parsedRooms.length);
      }

      // ── Hoja PD (completamente opcional) ────────────────────────────────
      let parsedPressures = [];
      if (config.pdSheetId && config.pdGid != null) {
        console.log('[useRoomsData] Fetcheando hoja PD...');
        const pdCsv     = await fetchSheetAsCsv(config.pdSheetId, config.pdGid);
        parsedPressures = parsePD(parseCsv(pdCsv));
        console.log('[useRoomsData] PD:', parsedPressures.length, 'pares');
      } else {
        console.log('[useRoomsData] Sin hoja PD configurada.');
      }

      if (gen !== genRef.current) {
        console.log('[useRoomsData] Fetch obsoleto, descartando.');
        return;
      }

      setRooms(parsedRooms);
      setPressures(parsedPressures);
      setLastUpdated(new Date());

      const cached = loadCache();
      saveCache(parsedRooms, parsedPressures, cached?.equipment ?? []);
    } catch (err) {
      if (gen !== genRef.current) return;
      console.error('[useRoomsData] Error:', err);
      setError(err.message);
    } finally {
      if (gen === genRef.current) setLoading(false);
    }
  }, []);

  return { rooms, pressures, loading, error, lastUpdated, loadData, clearData };
}
