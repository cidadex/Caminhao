import * as SQLite from 'expo-sqlite';

export type BufferedPoint = {
  id?: number;
  sessionId: string;
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  altitude: number | null;
  capturedAt: string;
};

let db: SQLite.SQLiteDatabase | null = null;

export async function initBuffer(): Promise<void> {
  db = await SQLite.openDatabaseAsync('truckflow.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS pending_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      speed REAL,
      heading REAL,
      accuracy REAL,
      altitude REAL,
      captured_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS active_session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      session_id TEXT NOT NULL,
      started_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pending_session ON pending_points(session_id);
  `);
}

function ensureDb(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('Buffer não inicializado. Chame initBuffer() antes.');
  return db;
}

export async function setActiveSession(sessionId: string): Promise<void> {
  const d = ensureDb();
  await d.runAsync('DELETE FROM active_session');
  await d.runAsync('INSERT INTO active_session (id, session_id, started_at) VALUES (1, ?, ?)', [
    sessionId,
    new Date().toISOString(),
  ]);
}

export async function getActiveSession(): Promise<string | null> {
  const d = ensureDb();
  const row = await d.getFirstAsync<{ session_id: string }>('SELECT session_id FROM active_session WHERE id = 1');
  return row?.session_id ?? null;
}

export async function clearActiveSession(): Promise<void> {
  const d = ensureDb();
  await d.runAsync('DELETE FROM active_session');
}

export async function enqueuePoint(p: BufferedPoint): Promise<void> {
  const d = ensureDb();
  await d.runAsync(
    'INSERT INTO pending_points (session_id, lat, lng, speed, heading, accuracy, altitude, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [p.sessionId, p.lat, p.lng, p.speed, p.heading, p.accuracy, p.altitude, p.capturedAt],
  );
}

export async function takeBatch(sessionId: string, max = 50): Promise<BufferedPoint[]> {
  const d = ensureDb();
  const rows = await d.getAllAsync<{
    id: number;
    session_id: string;
    lat: number;
    lng: number;
    speed: number | null;
    heading: number | null;
    accuracy: number | null;
    altitude: number | null;
    captured_at: string;
  }>(
    'SELECT * FROM pending_points WHERE session_id = ? ORDER BY id ASC LIMIT ?',
    [sessionId, max],
  );
  return rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    lat: r.lat,
    lng: r.lng,
    speed: r.speed,
    heading: r.heading,
    accuracy: r.accuracy,
    altitude: r.altitude,
    capturedAt: r.captured_at,
  }));
}

export async function deleteByIds(ids: number[]): Promise<void> {
  if (!ids.length) return;
  const d = ensureDb();
  const placeholders = ids.map(() => '?').join(',');
  await d.runAsync(`DELETE FROM pending_points WHERE id IN (${placeholders})`, ids as any);
}

export async function deleteAllForSession(sessionId: string): Promise<void> {
  const d = ensureDb();
  await d.runAsync('DELETE FROM pending_points WHERE session_id = ?', [sessionId]);
}

export async function pendingCount(sessionId?: string): Promise<number> {
  const d = ensureDb();
  if (sessionId) {
    const r = await d.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM pending_points WHERE session_id = ?', [sessionId]);
    return r?.c ?? 0;
  }
  const r = await d.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM pending_points');
  return r?.c ?? 0;
}
