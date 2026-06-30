import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing, shadows } from "../utils/theme";
import {
  usePulseAnimation,
  useFadeInAnimation,
  useSlideInAnimation,
  useScalePulseAnimation,
} from "../utils/animations";
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
} from "../utils/HealthCalculator";

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

  //! for animation
  const { opacity: fadeOpacity } = useFadeInAnimation(200);
  const { transform: slideTransform } = useSlideInAnimation(true, 300);
  const { opacity: pulseOpacity } = usePulseAnimation(2500);
  const scaleAnimation = useScalePulseAnimation(0.95, 1.1, 2000);

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
    <LinearGradient
      colors={[colors.darkBg, colors.darkBg2, colors.darkBg]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {isPedometerAvailable === "checking" ? (
        <View style={styles.loaderContainer}>
          <LinearGradient
            colors={[colors.neonCyan, colors.neonPurple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loaderGradient}
          >
            <ActivityIndicator color={colors.textPrimary} size="large" />
          </LinearGradient>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View style={{ opacity: fadeOpacity }}>
            {/* Header */}
            <Animated.View style={slideTransform}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>LIVE STATS</Text>
                <Text style={styles.headerSubtitle}>
                  Real-time Fitness Tracking
                </Text>
              </View>
            </Animated.View>

            {/* Main Steps Card */}
            <Animated.View style={slideTransform}>
              <LinearGradient
                colors={[colors.darkBg2, colors.darkBg3]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.mainCard}
              >
                <Animated.View style={[styles.stepPulse, scaleAnimation]}>
                  <LinearGradient
                    colors={[colors.neonCyan, colors.neonPurple]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.stepPulseGradient}
                  />
                </Animated.View>

                <Text style={styles.label}>🚶 Steps Today</Text>
                <Animated.Text
                  style={[
                    styles.mainValue,
                    {
                      opacity: pulseOpacity,
                    },
                  ]}
                >
                  {dailySteps}
                </Animated.Text>
                <Text style={styles.subtext}>Steps</Text>
              </LinearGradient>
            </Animated.View>

            {/* Quick Stats Grid */}
            <Animated.View style={slideTransform}>
              <View style={styles.statsGrid}>
                {/* Calories Card */}
                <LinearGradient
                  colors={[colors.neonYellow + "20", colors.neonYellow + "10"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.statCard, { borderColor: colors.neonYellow }]}
                >
                  <Text style={styles.statIcon}>🔥</Text>
                  <Text style={styles.statLabel}>Calories</Text>
                  <Text
                    style={[styles.statValue, { color: colors.neonYellow }]}
                  >
                    {caloriesBurned}
                  </Text>
                  <Text style={styles.statUnit}>kcal</Text>
                </LinearGradient>

                {/* Distance Card */}
                <LinearGradient
                  colors={[colors.neonGreen + "20", colors.neonGreen + "10"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.statCard, { borderColor: colors.neonGreen }]}
                >
                  <Text style={styles.statIcon}>📍</Text>
                  <Text style={styles.statLabel}>Distance</Text>
                  <Text style={[styles.statValue, { color: colors.neonGreen }]}>
                    {(distanceMeters / 1000).toFixed(2)}
                  </Text>
                  <Text style={styles.statUnit}>km</Text>
                </LinearGradient>
              </View>
            </Animated.View>

            {/* Live Metrics */}
            <Animated.View style={slideTransform}>
              <View style={styles.liveMetricsContainer}>
                <Text style={styles.metricsTitle}>⚡ Live Metrics</Text>

                {/* Speed Card */}
                <LinearGradient
                  colors={[colors.neonBlue + "20", colors.neonCyan + "10"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.metricCard, { borderColor: colors.neonCyan }]}
                >
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricIcon}>💨</Text>
                    <Text style={styles.metricName}>Speed</Text>
                  </View>
                  <Text
                    style={[styles.metricBigValue, { color: colors.neonCyan }]}
                  >
                    {instantSpeed.toFixed(2)}
                  </Text>
                  <Text style={styles.metricUnitSmall}>m/s</Text>
                </LinearGradient>

                {/* Intensity Card */}
                <LinearGradient
                  colors={[colors.neonMagenta + "20", colors.neonPink + "10"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.metricCard,
                    { borderColor: colors.neonMagenta },
                  ]}
                >
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricIcon}>⚡</Text>
                    <Text style={styles.metricName}>Intensity</Text>
                  </View>
                  <Text
                    style={[
                      styles.metricBigValue,
                      { color: colors.neonMagenta },
                    ]}
                  >
                    {liveMet.toFixed(1)}
                  </Text>
                  <Text style={styles.metricUnitSmall}>MET</Text>
                </LinearGradient>

                {/* Time Card */}
                <LinearGradient
                  colors={[colors.neonGreen + "20", colors.neonCyan + "10"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.metricCard, { borderColor: colors.neonGreen }]}
                >
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricIcon}>⏱️</Text>
                    <Text style={styles.metricName}>Time</Text>
                  </View>
                  <Text
                    style={[styles.metricBigValue, { color: colors.neonGreen }]}
                  >
                    {(() => {
                      const hh = Math.floor(walkingSeconds / 3600);
                      const mm = Math.floor((walkingSeconds % 3600) / 60);
                      const ss = Math.floor(walkingSeconds % 60);
                      return [hh, mm, ss]
                        .map((v) => String(v).padStart(2, "0"))
                        .join(":");
                    })()}
                  </Text>
                  <Text style={styles.metricUnitSmall}>hh:mm:ss</Text>
                </LinearGradient>
              </View>
            </Animated.View>

            {/* Status Section */}
            <Animated.View style={slideTransform}>
              <LinearGradient
                colors={[colors.darkBg3, colors.darkBg2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statusCard}
              >
                <View style={styles.statusItem}>
                  <Text style={styles.statusIcon}>📡</Text>
                  <View style={styles.statusContent}>
                    <Text style={styles.statusLabel}>Sensor Status</Text>
                    <Text
                      style={[
                        styles.statusValue,
                        {
                          color:
                            isPedometerAvailable === "true"
                              ? colors.neonGreen
                              : colors.neonYellow,
                        },
                      ]}
                    >
                      {isPedometerAvailable === "true"
                        ? "● Active"
                        : "● Unavailable"}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.neonCyan,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.neonCyan,
    letterSpacing: 2,
    textShadowColor: colors.neonCyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  mainCard: {
    borderRadius: 20,
    padding: spacing.xxl,
    marginBottom: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.neonCyan,
    borderOpacity: 0.2,
    ...shadows.soft,
    position: "relative",
    overflow: "hidden",
  },
  stepPulse: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "80%",
    height: 200,
    borderRadius: 100,
  },
  stepPulseGradient: {
    width: "100%",
    height: "100%",
    opacity: 0.1,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  mainValue: {
    fontSize: 64,
    fontWeight: "900",
    color: colors.neonCyan,
    textShadowColor: colors.neonCyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  subtext: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderOpacity: 0.3,
    minHeight: 140,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: spacing.xs,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  statUnit: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "600",
  },
  liveMetricsContainer: {
    marginBottom: spacing.xl,
  },
  metricsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.neonCyan,
    letterSpacing: 1,
    marginBottom: spacing.lg,
    textTransform: "uppercase",
  },
  metricCard: {
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderOpacity: 0.3,
    ...shadows.soft,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  metricIcon: {
    fontSize: 22,
    marginRight: spacing.md,
  },
  metricName: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  metricBigValue: {
    fontSize: 32,
    fontWeight: "900",
    marginBottom: spacing.xs,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  metricUnitSmall: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },
  statusCard: {
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.neonGreen,
    borderOpacity: 0.2,
    ...shadows.soft,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIcon: {
    fontSize: 24,
    marginRight: spacing.lg,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  testButton: {
    paddingVertical: spacing.lg,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.neonPurple,
  },
  testButtonText: {
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 1,
  },
});
