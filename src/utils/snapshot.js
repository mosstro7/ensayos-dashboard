const SNAPSHOT_KEY_PREFIX = 'ensayos_snapshot_';

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

export function computeDelta(currentRooms, currentEquipment, snapshot) {
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
        .filter(([, t]) => !t.done)
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
