import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
} from "react-native";
import { Pedometer } from "expo-sensors";
import { useDispatch, useSelector } from "react-redux";
import { auth, db } from "../services/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  updateActivity,
  resetDailyStats,
  addLiveActivity,
} from "../redux/slices/healthSlice";
import * as Notifications from "expo-notifications";
import { requestPermissionsAndSchedule } from "../services/notificationService";
import { Alert } from "react-native";
import {
  calculateDistance,
  calculateSpeed,
  calculateMET,
  calculateCalories,
} from "../ultis/HealthCalculator";

export default function DashboardScreen() {
  const dispatch = useDispatch();

  //! Pull stats from Redux (added weight for precise calorie calculation)
  const {
    dailySteps,
    caloriesBurned,
    distanceMeters,
    walkingSeconds,
    strideLength,
    weight,
  } = useSelector((state) => state.health);

  const [isPedometerAvailable, setIsPedometerAvailable] = useState("checking");
  const [hasNotified2k, setHasNotified2k] = useState(false);
  const [hasNotified5k, setHasNotified5k] = useState(false);

  //! Live Speedometer State & Refs
  const [instantSpeed, setInstantSpeed] = useState(0);
  const sittingTimer = useRef(null);

  //! Dynamic Live MET Calculation for UI
  const liveMet = instantSpeed === 0 ? 1.0 : calculateMET(instantSpeed);

  //! Notification
  useEffect(() => {
    requestPermissionsAndSchedule();

    const receivedListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("RECEIVED:", notification);
      },
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log("CLICKED:", data);

        if (data.type === "WATER_REMINDER") {
          Alert.alert("💧 Uống nước", "Bạn đã uống nước chưa?");
        }
        if (data.type === "MOVE_REMINDER") {
          Alert.alert("🏃‍♂️ Vận động", "Đi bộ vài bước nhé!");
        }
      });

    return () => {
      receivedListener.remove();
      responseListener.remove();
    };
  }, []);

  //! Load profile data from Firestore
  useEffect(() => {
    const loadCurrentSteps = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const today = new Date().toISOString().split("T")[0];

      try {
        const currentRef = doc(db, "users", userId, "history", today);
        const currentSnap = await getDoc(currentRef);

        if (!currentSnap.exists()) return;

        const data = currentSnap.data();

        if (data.date !== today) {
          dispatch(resetDailyStats());
          return;
        }

        const steps = data.steps || 0;
        const storedWalkingSeconds = data.walkingSeconds || (steps / 100) * 60;

        dispatch(
          updateActivity({ steps, walkingSeconds: storedWalkingSeconds }),
        );
      } catch (error) {
        console.log("Load current steps error:", error);
      }
    };

    loadCurrentSteps();
  }, [dispatch]);

  //! Log changes
  useEffect(() => {
    console.log(
      `[HealthTracker] Steps: ${dailySteps} | Calories: ${caloriesBurned} kcal | Distance: ${distanceMeters.toFixed(1)}m | Live MET: ${liveMet}`,
    );
  }, [dailySteps, caloriesBurned, distanceMeters, liveMet]);

  //! Get today's total steps and estimate time
  const getTodaySteps = async () => {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();

      const result = await Pedometer.getStepCountAsync(start, end);
      const steps = result.steps;

      const estimatedSeconds = (steps / 100) * 60;

      dispatch(updateActivity({ steps, walkingSeconds: estimatedSeconds }));
    } catch (error) {
      console.log("Get steps error:", error);
    }
  };

  //! Initialize Pedometer
  useEffect(() => {
    const initialize = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(String(isAvailable));
      if (!isAvailable) return;

      const { status } = await Pedometer.requestPermissionsAsync();
      if (status !== "granted") return;

      await getTodaySteps();
    };

    initialize();
  }, []);

  //! Time-Delta Pedometer Watcher (Live Physics)
  useEffect(() => {
    let subscription;
    let lastTime = Date.now();
    let lastSessionSteps = 0;

    const subscribe = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) return;

      // Initialize base step count so delta doesn't spike on load
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const initialResult = await Pedometer.getStepCountAsync(
        start,
        new Date(),
      );
      lastSessionSteps = initialResult.steps;

      subscription = Pedometer.watchStepCount(async (result) => {
        const now = Date.now();

        // 1. Calculate Delta (Difference between now and last event)
        const deltaSteps = result.steps - lastSessionSteps;
        const deltaTimeSec = (now - lastTime) / 1000;

        // 2. Process Live Physics if actually moving
        if (deltaSteps > 0 && deltaTimeSec > 0 && strideLength > 0) {
          // Execute the un-generalized pipeline
          const deltaDistance = calculateDistance(deltaSteps, strideLength);
          const liveSpeed = calculateSpeed(deltaDistance, deltaTimeSec);
          const liveMetVal = calculateMET(liveSpeed);

          // Calculate precise calories for just this window
          const deltaCalories = calculateCalories(
            weight,
            deltaTimeSec,
            liveMetVal,
          );

          // Update local UI
          setInstantSpeed(liveSpeed);

          // Accumulate into Redux
          dispatch(
            addLiveActivity({
              deltaSteps,
              deltaDistance,
              deltaWalkingSeconds: deltaTimeSec,
              deltaCalories,
            }),
          );
        }

        // Update tracking variables
        lastSessionSteps = result.steps;
        lastTime = now;

        // -----------------------------------------
        // The "Sitting" Timeout
        // If 3 seconds pass with no new steps, drop speed to 0
        // -----------------------------------------
        if (sittingTimer.current) clearTimeout(sittingTimer.current);
        sittingTimer.current = setTimeout(() => {
          setInstantSpeed(0);
        }, 3000);
      });
    };

    subscribe();

    return () => {
      subscription?.remove();
      if (sittingTimer.current) clearTimeout(sittingTimer.current);
    };
  }, [dispatch, strideLength, weight]); // Added weight as dependency

  //! Step-based Notifications
  useEffect(() => {
    const triggerStepBasedNotification = async () => {
      if (dailySteps >= 2000 && dailySteps < 5000 && !hasNotified2k) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🚰 Cơ thể đang mất nước!",
            body: `Bạn đã đi được ${dailySteps} bước. Hãy uống một ngụm nước để bù khoáng nhé!`,
            data: { type: "WATER_ACTIVITY_REMINDER" },
          },
          trigger: null,
        });
        setHasNotified2k(true);
      }

      if (dailySteps >= 5000 && !hasNotified5k) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🧘‍♂️ Tới giờ nghỉ ngơi rồi!",
            body: `Tuyệt vời! ${dailySteps} bước là một quãng đường dài. Hãy ngồi nghỉ 5-10 phút để cơ bắp phục hồi nhé.`,
            data: { type: "REST_REMINDER" },
          },
          trigger: null,
        });
        setHasNotified5k(true);
      }
    };

    triggerStepBasedNotification();
  }, [dailySteps]);

  //! Auto-sync data to Firebase
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
        console.log(`Đã đồng bộ lên Cloud: ${dailySteps} bước`);
      } catch (error) {
        console.log("Lỗi đồng bộ dữ liệu:", error);
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [dailySteps, caloriesBurned, distanceMeters, walkingSeconds]);

  return (
    <View style={styles.container}>
      {isPedometerAvailable === "checking" ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <View style={styles.statsCard}>
          <Text style={styles.label}>Today's Steps</Text>
          <Text style={styles.value}>{dailySteps}</Text>

          <Text style={styles.label}>Calories Burned</Text>
          <Text style={styles.value}>{caloriesBurned} kcal</Text>

          <Text style={styles.label}>Distance</Text>
          <Text style={styles.value}>
            {(distanceMeters / 1000).toFixed(2)} km
          </Text>

          <Text style={styles.label}>Walking Time</Text>
          <Text style={styles.value}>
            {(() => {
              const hh = Math.floor(walkingSeconds / 3600);
              const mm = Math.floor((walkingSeconds % 3600) / 60);
              const ss = Math.floor(walkingSeconds % 60);

              return [hh, mm, ss]
                .map((v) => String(v).padStart(2, "0"))
                .join(":");
            })()}
          </Text>

          <View style={{ flexDirection: "row", gap: 20, marginTop: 10 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.smallLabel}>Live Speed</Text>
              <Text style={styles.smallValue}>
                {instantSpeed.toFixed(2)} m/s
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.smallLabel}>Intensity</Text>
              {/* Displaying Live MET instead of Average MET */}
              <Text style={styles.smallValue}>{liveMet} MET</Text>
            </View>
          </View>

          <Text style={styles.sensorStatus}>
            Sensor Status:{" "}
            {isPedometerAvailable === "true" ? "Active" : "Unavailable"}
          </Text>

          <Button
            title="Test Notification"
            onPress={async () => {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "TEST",
                  body: "Hello World",
                },
                trigger: null,
              });
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    padding: 30,
    borderRadius: 15,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  label: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  value: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#111827",
    marginVertical: 2,
  },
  smallLabel: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "uppercase",
  },
  smallValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3B82F6",
  },
  sensorStatus: {
    marginTop: 30,
    marginBottom: 10,
    fontSize: 12,
    color: "#9CA3AF",
  },
});
