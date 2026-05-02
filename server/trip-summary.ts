import type { LocationPoint, TripSummary, TrackingSession } from "@shared/schema";

const EARTH_RADIUS_KM = 6371;
const MAX_REASONABLE_SPEED_KMH = 200;
const MAX_REASONABLE_ACCURACY_M = 100;

function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return EARTH_RADIUS_KM * c;
}

export function computeTripSummary(
  session: Pick<TrackingSession, "startedAt" | "endedAt">,
  pointsAsc: LocationPoint[],
): TripSummary {
  let kmTraveled = 0;
  let prev: LocationPoint | null = null;
  for (const p of pointsAsc) {
    if (p.accuracy != null && Number(p.accuracy) > MAX_REASONABLE_ACCURACY_M) {
      continue;
    }
    if (prev) {
      const segKm = haversineKm(
        Number(prev.lat),
        Number(prev.lng),
        Number(p.lat),
        Number(p.lng),
      );
      const dtH =
        (new Date(p.timestamp).getTime() -
          new Date(prev.timestamp).getTime()) /
        3_600_000;
      if (dtH > 0) {
        const impliedKmh = segKm / dtH;
        if (impliedKmh <= MAX_REASONABLE_SPEED_KMH) {
          kmTraveled += segKm;
        }
      } else {
        kmTraveled += segKm;
      }
    }
    prev = p;
  }
  const startedAtIso = new Date(session.startedAt).toISOString();
  const endedAtIso = session.endedAt
    ? new Date(session.endedAt).toISOString()
    : null;
  const endRef = session.endedAt ? new Date(session.endedAt) : new Date();
  const durationSeconds = Math.max(
    0,
    Math.floor(
      (endRef.getTime() - new Date(session.startedAt).getTime()) / 1000,
    ),
  );
  const averageSpeedKmh =
    durationSeconds > 0 ? (kmTraveled / durationSeconds) * 3600 : 0;
  return {
    kmTraveled: Number(kmTraveled.toFixed(2)),
    durationSeconds,
    averageSpeedKmh: Number(averageSpeedKmh.toFixed(2)),
    pointsCount: pointsAsc.length,
    startedAt: startedAtIso,
    endedAt: endedAtIso,
  };
}
