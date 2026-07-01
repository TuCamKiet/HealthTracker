import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import { Pedometer } from "expo-sensors";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "./firebaseConfig";
import { doc, setDoc } from "firebase/firestore";

export const BACKGROUND_STEP_TASK = "background-step-check";

const WATER_MILESTONE = 2000;
const REST_MILESTONE = 5000;
const SITTING_THRESHOLD_MS = 3600 * 1000;

const KEYS = {
  waterMilestone: "@tracking_last_water_milestone",
  restMilestone: "@tracking_last_rest_milestone",
  lastStepCount: "@tracking_last_step_count",
  lastStepChangeAt: "@tracking_last_step_change_at",
  lastInactivityNotifyAt: "@tracking_last_inactivity_notify_at",
  trackedDate: "@tracking_date",
};

async function getNum(key, fallback = 0) {
  const v = await AsyncStorage.getItem(key);
  return v === null ? fallback : Number(v);
}

async function setNum(key, value) {
  await AsyncStorage.setItem(key, String(value));
}

// The actual work: read current device step count, compare against the
// last known state (persisted, not in-memory), and fire whatever
// notifications are due. Designed to be safe to call from a foreground
// effect (HealthMonitor) AND from the background task — both paths use
// the same persisted milestone keys so they can never double-fire or
// disagree with each other.
export async function runStepCheck() {
  const today = new Date().toISOString().split("T")[0];
  const trackedDate = await AsyncStorage.getItem(KEYS.trackedDate);

  // Reset milestone trackers on day rollover
  if (trackedDate !== today) {
    await AsyncStorage.multiSet([
      [KEYS.trackedDate, today],
      [KEYS.waterMilestone, "0"],
      [KEYS.restMilestone, "0"],
    ]);
  }

  const isAvailable = await Pedometer.isAvailableAsync();
  if (!isAvailable) return;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const result = await Pedometer.getStepCountAsync(start, new Date());
  const steps = result.steps;

  const lastWaterMilestone = await getNum(KEYS.waterMilestone);
  const lastRestMilestone = await getNum(KEYS.restMilestone);
  const lastStepCount = await getNum(KEYS.lastStepCount);
  const lastStepChangeAt = await getNum(KEYS.lastStepChangeAt, Date.now());

  // --- Water milestone (every 2,000 steps) ---
  const waterMilestone = Math.floor(steps / WATER_MILESTONE) * WATER_MILESTONE;
  if (waterMilestone > 0 && waterMilestone > lastWaterMilestone) {
    await setNum(KEYS.waterMilestone, waterMilestone);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Hydration check",
        body: `You've hit ${waterMilestone} steps. Time for a water break.`,
        data: { type: "WATER_ACTIVITY_REMINDER" },
      },
      trigger: null,
    });
  }

  // --- Rest milestone (every 5,000 steps) ---
  const restMilestone = Math.floor(steps / REST_MILESTONE) * REST_MILESTONE;
  if (restMilestone > 0 && restMilestone > lastRestMilestone) {
    await setNum(KEYS.restMilestone, restMilestone);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Nice work!",
        body: `${restMilestone} steps down. Take 5-10 minutes to recover.`,
        data: { type: "REST_REMINDER" },
      },
      trigger: null,
    });
  }

  // --- Inactivity: steps haven't changed since lastStepChangeAt ---
  const now = Date.now();
  if (steps !== lastStepCount) {
    // Movement happened since we last checked — reset the clock
    await setNum(KEYS.lastStepChangeAt, now);
  } else {
    const idleMs = now - lastStepChangeAt;
    const lastNotifyAt = await getNum(KEYS.lastInactivityNotifyAt, 0);
    const sinceLastNotify = now - lastNotifyAt;

    if (
      idleMs >= SITTING_THRESHOLD_MS &&
      sinceLastNotify >= SITTING_THRESHOLD_MS
    ) {
      await setNum(KEYS.lastInactivityNotifyAt, now);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Time to stand up",
          body: "You've been sitting for an hour. Take a short walk to get your blood flowing.",
          data: { type: "MOVE_REMINDER" },
        },
        trigger: null,
      });
    }
  }

  await setNum(KEYS.lastStepCount, steps);

  // Best-effort sync so Firestore stays current even if the app never
  // reopens to flush it via the normal foreground sync.
  const userId = auth.currentUser?.uid;
  if (userId) {
    try {
      const historyRef = doc(db, "users", userId, "history", today);
      await setDoc(
        historyRef,
        { steps, date: today, updatedAt: new Date() },
        { merge: true },
      );
    } catch (e) {
      console.log("Background sync error:", e);
    }
  }
}

// Must be defined at module scope (not inside a component) so the OS can
// invoke it even when no React tree is mounted.
TaskManager.defineTask(BACKGROUND_STEP_TASK, async () => {
  try {
    await runStepCheck();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.log("Background step task error:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundStepTask() {
  try {
    await BackgroundTask.registerTaskAsync(BACKGROUND_STEP_TASK, {
      minimumInterval: 15, // minutes — OS treats this as a minimum, not a guarantee
    });
  } catch (error) {
    console.log("Failed to register background task:", error);
  }
}

export async function unregisterBackgroundStepTask() {
  try {
    const isRegistered =
      await TaskManager.isTaskRegisteredAsync(BACKGROUND_STEP_TASK);
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(BACKGROUND_STEP_TASK);
    }
  } catch (error) {
    console.log("Failed to unregister background task:", error);
  }
}
