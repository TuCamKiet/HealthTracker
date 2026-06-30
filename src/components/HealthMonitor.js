import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Pedometer } from "expo-sensors";
import * as Notifications from "expo-notifications";
import { auth, db } from "../services/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { addLiveActivity } from "../redux/slices/healthSlice";
import {
  calculateDistance,
  calculateSpeed,
  calculateMET,
  calculateCalories,
} from "../utils/HealthCalculator";

const WATER_MILESTONE = 20;
const REST_MILESTONE = 5000;
const SITTING_THRESHOLD_MS = 3600 * 1000;

export default function HealthMonitor() {
  const dispatch = useDispatch();
  const {
    dailySteps,
    caloriesBurned,
    distanceMeters,
    walkingSeconds,
    strideLength,
    weight,
  } = useSelector((state) => state.health);

  const lastWaterMilestone = useRef(0);
  const lastRestMilestone = useRef(0);
  const inactivityTimer = useRef(null);

  // 1. Global Pedometer Watcher (Now safely using Deltas!)
  useEffect(() => {
    let subscription;
    let lastTime = Date.now();
    let lastSessionSteps = 0;

    const armInactivityNotification = async () => {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🪑 Time to stand up",
            body: "You've been sitting for an hour. Take a short walk to get your blood flowing.",
            data: { type: "MOVE_REMINDER" },
          },
          trigger: null,
        });
      } catch (e) {
        console.log("Inactivity error:", e);
      }
      inactivityTimer.current = setTimeout(
        armInactivityNotification,
        SITTING_THRESHOLD_MS,
      );
    };

    const subscribe = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) return;

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const initialResult = await Pedometer.getStepCountAsync(
        start,
        new Date(),
      );
      lastSessionSteps = initialResult.steps;

      inactivityTimer.current = setTimeout(
        armInactivityNotification,
        SITTING_THRESHOLD_MS,
      );

      subscription = Pedometer.watchStepCount((result) => {
        const now = Date.now();
        const deltaSteps = result.steps - lastSessionSteps; // Calculate only new steps
        const deltaTimeSec = (now - lastTime) / 1000;

        if (deltaSteps > 0 && deltaTimeSec > 0 && strideLength > 0) {
          const deltaDistance = calculateDistance(deltaSteps, strideLength);
          const liveSpeed = calculateSpeed(deltaDistance, deltaTimeSec);
          const liveMetVal = calculateMET(liveSpeed);
          const deltaCalories = calculateCalories(
            weight,
            deltaTimeSec,
            liveMetVal,
          );

          // ADD to the total, do not overwrite!
          dispatch(
            addLiveActivity({
              deltaSteps,
              deltaDistance,
              deltaWalkingSeconds: deltaTimeSec,
              deltaCalories,
            }),
          );
        }

        lastSessionSteps = result.steps;
        lastTime = now;

        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        inactivityTimer.current = setTimeout(
          armInactivityNotification,
          SITTING_THRESHOLD_MS,
        );
      });
    };

    subscribe();

    return () => {
      subscription?.remove();
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [dispatch, strideLength, weight]);

  // 2. Milestone Notifications
  useEffect(() => {
    const checkMilestones = async () => {
      const waterMilestone =
        Math.floor(dailySteps / WATER_MILESTONE) * WATER_MILESTONE;
      if (waterMilestone > 0 && waterMilestone > lastWaterMilestone.current) {
        lastWaterMilestone.current = waterMilestone;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🚰 Hydration check",
            body: `You've hit ${waterMilestone} steps. Time for a water break.`,
            data: { type: "WATER_ACTIVITY_REMINDER" },
          },
          trigger: null,
        });
      }

      const restMilestone =
        Math.floor(dailySteps / REST_MILESTONE) * REST_MILESTONE;
      if (restMilestone > 0 && restMilestone > lastRestMilestone.current) {
        lastRestMilestone.current = restMilestone;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🧘‍♂️ Rest reminder",
            body: `Amazing job! ${restMilestone} steps is a lot. Take a breather.`,
            data: { type: "REST_REMINDER" },
          },
          trigger: null,
        });
      }
    };
    checkMilestones();
  }, [dailySteps]);

  // 3. Auto-sync to Firebase
  useEffect(() => {
    if (dailySteps === 0) return;
    const timeoutId = setTimeout(async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const today = new Date().toISOString().split("T")[0];
      const historyRef = doc(db, "users", userId, "history", today);
      try {
        await setDoc(
          historyRef,
          {
            steps: dailySteps,
            calories: caloriesBurned,
            distance: distanceMeters,
            walkingSeconds: walkingSeconds,
            date: today,
            updatedAt: new Date(),
          },
          { merge: true },
        );
      } catch (error) {
        console.log("Sync error:", error);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [dailySteps, caloriesBurned, distanceMeters, walkingSeconds]);

  return null;
}
