import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { enqueuePoint, getActiveSession } from './buffer';
import { syncBatchOnce } from './sync';

export const LOCATION_TASK_NAME = 'truckflow-location-task';

type LocationTaskBody = { locations?: Location.LocationObject[] };

export function registerTrackingTask() {
  if (TaskManager.isTaskDefined(LOCATION_TASK_NAME)) return;
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.warn('[tracking-task] error', error.message);
      return;
    }
    const sessionId = await getActiveSession();
    if (!sessionId) return;
    const body = (data ?? {}) as LocationTaskBody;
    const locations = body.locations ?? [];
    for (const loc of locations) {
      await enqueuePoint({
        sessionId,
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        speed: loc.coords.speed,
        heading: loc.coords.heading,
        accuracy: loc.coords.accuracy,
        altitude: loc.coords.altitude,
        capturedAt: new Date(loc.timestamp).toISOString(),
      });
    }
    // Best-effort flush; failures stay in the buffer for the next tick.
    try {
      await syncBatchOnce();
    } catch (e: any) {
      console.warn('[tracking-task] sync failed', e?.message);
    }
  });
}

export async function startBackgroundTracking() {
  registerTrackingTask();
  const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (isRunning) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,
    distanceInterval: 10,
    deferredUpdatesInterval: 5000,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'TruckFlow registrando viagem',
      notificationBody: 'O GPS está ativo para registrar a viagem em andamento.',
      notificationColor: '#0f172a',
    },
  });
}

export async function stopBackgroundTracking() {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

export async function isTrackingRunning(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}
