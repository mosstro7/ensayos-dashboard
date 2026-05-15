const SNAPSHOT_KEY_PREFIX = 'ensayos_snapshot_';

function isGmpD(gmpClass) {
  if (!gmpClass) return false;
  const s = String(gmpClass).toUpperCase();
  return s.endsWith('D') || s.includes(' D') || s.includes('ISO 8')
      || s.includes('INFORMATIVO') || s.includes('INFORMATIVA');
}

function isRoomTestActive(testName, room, settings) {
  if (!settings) return true;
  if (testName === 'Integridad') {
    if (settings.integridad === 'none') return false;
    if (settings.integridad === 'exclude-d' && isGmpD(room.gmpClass)) return false;
  }
  if (testName === 'Ren. Horarias' && settings.renovaciones === false) return false;
  if (testName === 'Temperatura'   && settings.temperatura === false)  return false;
  if (testName === 'Humedad'       && settings.humedad === false)      return false;
  if (testName === 'Luz'           && settings.luz === false)          return false;
  if (testName === 'Ruido'         && settings.ruido === false)        return false;
  if (testName === 'Recuperación') {
    if (settings.recuperacion === false) return false;
    if (settings.recuperacionSalas?.[room.id] === false) return false;
  }
  return true;
}

function isEquipTestActive(testName, settings) {
  if (!settings) return true;
  if (testName === 'Luz'   && settings.luz === false)   return false;
  if (testName === 'Ruido' && settings.ruido === false) return false;
  return true;
}

function snapshotKey(dateStr) {
  return `${SNAPSHOT_KEY_PREFIX}${dateStr}`;
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function saveSnapshot(rooms, equipment) {
  const today = todayStr();
  const key = snapshotKey(today);

  if (localStorage.getItem(key)) return;

  const snapshot = {
    date: today,
    savedAt: new Date().toISOString(),
    rooms: rooms.map(r => ({
      id: r.id,
      tests: Object.fromEntries(
        Object.entries(r.tests || {}).map(([name, t]) => [name, { done: t.done, result: t.result }])
      ),
    })),
    equipment: (equipment || []).map(e => ({
      id: e.id,
      tests: Object.fromEntries(
        Object.entries(e.tests || {}).map(([name, t]) => [name, { done: t.done, result: t.result }])
      ),
    })),
  };

  try {
    localStorage.setItem(key, JSON.stringify(snapshot));
    cleanOldSnapshots(30);
  } catch (e) {
    console.warn('[Snapshot] No se pudo guardar el snapshot:', e);
  }
}

export function getSnapshot(dateStr = yesterdayStr()) {
  try {
    const raw = localStorage.getItem(snapshotKey(dateStr));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function computeDelta(currentRooms, currentEquipment, snapshot, settings) {
  const newlyDone = [];
  const newlyNonConforme = [];

  const prevRoomsMap = Object.fromEntries(
    (snapshot?.rooms || []).map(r => [r.id, r])
  );
  const prevEquipMap = Object.fromEntries(
    (snapshot?.equipment || []).map(e => [e.id, e])
  );

  for (const room of currentRooms) {
    const prev = prevRoomsMap[room.id];
    for (const [testName, test] of Object.entries(room.tests || {})) {
      if (!isRoomTestActive(testName, room, settings)) continue;
      const wasDone = prev?.tests?.[testName]?.done ?? false;
      if (!wasDone && test.done) {
        newlyDone.push({ type: 'sala', id: room.id, name: room.fullName, testName });
        if (test.result === 'NO CONFORME') {
          newlyNonConforme.push({ type: 'sala', id: room.id, name: room.fullName, testName });
        }
      }
    }
  }

  for (const eq of currentEquipment || []) {
    const prev = prevEquipMap[eq.id];
    for (const [testName, test] of Object.entries(eq.tests || {})) {
      if (!isEquipTestActive(testName, settings)) continue;
      const wasDone = prev?.tests?.[testName]?.done ?? false;
      if (!wasDone && test.done) {
        newlyDone.push({ type: 'equipo', id: eq.id, name: eq.tag || eq.id, testName });
        if (test.result === 'NO CONFORME') {
          newlyNonConforme.push({ type: 'equipo', id: eq.id, name: eq.tag || eq.id, testName });
        }
      }
    }
  }

  const pendingRooms = currentRooms
    .map(r => ({
      id: r.id,
      name: r.fullName,
      pendingTests: Object.entries(r.tests || {})
        .filter(([name, t]) => isRoomTestActive(name, r, settings) && !t.done)
        .map(([name]) => name),
    }))
    .filter(r => r.pendingTests.length > 0);

  const nonConformeRooms = currentRooms
    .filter(r => r.hasNoConforme)
    .map(r => ({
      id: r.id,
      name: r.fullName,
      failedTests: Object.entries(r.tests || {})
        .filter(([, t]) => t.result === 'NO CONFORME')
        .map(([name]) => name),
    }));

  const nonConformeEquipment = (currentEquipment || [])
    .filter(e => e.hasNoConforme)
    .map(e => ({
      id: e.id,
      tag: e.tag,
      location: e.location,
      failedTests: Object.entries(e.tests || {})
        .filter(([, t]) => t.result === 'NO CONFORME')
        .map(([name]) => name),
    }));

  return { newlyDone, newlyNonConforme, pendingRooms, nonConformeRooms, nonConformeEquipment };
}

function cleanOldSnapshots(maxDays) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(SNAPSHOT_KEY_PREFIX)) continue;
    const dateStr = key.replace(SNAPSHOT_KEY_PREFIX, '');
    if (new Date(dateStr) < cutoff) localStorage.removeItem(key);
  }
}
