import { api, ApiError } from './api';
import { getStoredToken } from './auth';
import { deleteByIds, deleteAllForSession, getActiveSession, takeBatch } from './buffer';

let inFlight = false;

export async function syncBatchOnce(sessionIdOverride?: string): Promise<{ flushed: number } | null> {
  if (inFlight) return null;
  inFlight = true;
  try {
    const sessionId = sessionIdOverride ?? (await getActiveSession());
    if (!sessionId) return null;
    const token = await getStoredToken();
    if (!token) return null;
    const batch = await takeBatch(sessionId, 50);
    if (!batch.length) return { flushed: 0 };

    try {
      await api(`/api/driver/trips/${sessionId}/locations`, {
        method: 'POST',
        token,
        body: {
          points: batch.map((p) => ({
            lat: p.lat,
            lng: p.lng,
            speed: p.speed,
            heading: p.heading,
            accuracy: p.accuracy,
            altitude: p.altitude,
            capturedAt: p.capturedAt,
          })),
        },
      });
      await deleteByIds(batch.map((p) => p.id!).filter(Boolean));
      return { flushed: batch.length };
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Server already closed this session — drop the entire backlog for it,
        // not just the current batch, to avoid a permanent dead queue.
        await deleteAllForSession(sessionId);
      }
      throw e;
    }
  } finally {
    inFlight = false;
  }
}

/**
 * Drains the buffer for the given session until empty or the network fails.
 * Returns the number of points successfully sent. Used right before ending a trip.
 */
export async function drainSession(sessionId: string, maxIterations = 200): Promise<number> {
  let total = 0;
  for (let i = 0; i < maxIterations; i++) {
    const r = await syncBatchOnce(sessionId).catch(() => null);
    if (!r) return total;
    total += r.flushed;
    if (r.flushed === 0) return total;
  }
  return total;
}
