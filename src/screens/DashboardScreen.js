import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Animated,
  Alert,
} from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useDispatch, useSelector } from "react-redux";
import { auth, db } from "../services/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { updateActivity, resetDailyStats } from "../redux/slices/healthSlice";
import * as Notifications from "expo-notifications";
import { requestPermissionsAndSchedule } from "../services/notificationService";
import { Pedometer } from "expo-sensors";
import { useTheme } from "../context/ThemeContext";
import { useFadeInAnimation, useSlideInAnimation } from "../utils/animations";
import {
  calculateDistance,
  calculateSpeed,
  calculateMET,
} from "../utils/HealthCalculator";

// Evidence-based age-banded step goal
function getStepGoal(age) {
  if (!age || age < 60) return 9000;
  return 7000;
}

export default function DashboardScreen() {
  const dispatch = useDispatch();
  const { theme, spacing, softShadow } = useTheme();

  const {
    dailySteps,
    caloriesBurned,
    distanceMeters,
    walkingSeconds,
    strideLength,
    age,
  } = useSelector((state) => state.health);

  const [isPedometerAvailable, setIsPedometerAvailable] = useState("checking");
  const [instantSpeed, setInstantSpeed] = useState(0);

  const uiSittingTimer = useRef(null);

  const DAILY_GOAL = getStepGoal(age);
  const liveMet = instantSpeed === 0 ? 1.0 : calculateMET(instantSpeed);
  const progressPct = Math.min(dailySteps / DAILY_GOAL, 1);

  const { opacity: fadeOpacity } = useFadeInAnimation(150);
  const { transform: slideTransform } = useSlideInAnimation(true, 200);

  // 1. Notification Responders
  useEffect(() => {
    requestPermissionsAndSchedule();

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data.type === "WATER_ACTIVITY_REMINDER") {
          Alert.alert("Hydration check", "Have you had some water?");
        }
        if (data.type === "MOVE_REMINDER") {
          Alert.alert("Time to move", "Take a quick walk!");
        }
      });

    return () => {
      responseListener.remove();
    };
  }, []);

  // 2. Smart Initializer: Fetches Firebase & Device steps, keeps the highest.
  useEffect(() => {
    const initializeData = async () => {
      // 1. Check Sensor Permissions First
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(String(isAvailable));
      if (!isAvailable) return;

      const { status } = await Pedometer.requestPermissionsAsync();
      if (status !== "granted") return;

      // 2. Fetch from Firebase
      let firebaseSteps = 0;
      let firebaseSeconds = 0;
      const userId = auth.currentUser?.uid;
      const today = new Date().toISOString().split("T")[0];

      if (userId) {
        try {
          const currentRef = doc(db, "users", userId, "history", today);
          const currentSnap = await getDoc(currentRef);
          if (currentSnap.exists()) {
            const data = currentSnap.data();
            if (data.date === today) {
              firebaseSteps = data.steps || 0;
              firebaseSeconds = data.walkingSeconds || 0;
            } else {
              dispatch(resetDailyStats());
            }
          }
        } catch (error) {
          console.log("Firebase load error:", error);
        }
      }

      // 3. Fetch from Phone's Hardware Pedometer
      let deviceSteps = 0;
      let deviceSeconds = 0;
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const result = await Pedometer.getStepCountAsync(start, new Date());
        deviceSteps = result.steps;
        deviceSeconds = (deviceSteps / 100) * 60;
      } catch (error) {
        console.log("Device pedometer error:", error);
      }

      // 4. Take whichever is higher so we NEVER downgrade!
      const actualSteps = Math.max(firebaseSteps, deviceSteps);
      const actualSeconds = Math.max(firebaseSeconds, deviceSeconds);

      dispatch(
        updateActivity({ steps: actualSteps, walkingSeconds: actualSeconds }),
      );
    };

    initializeData();
  }, [dispatch]);

  // 3. Lightweight UI Watcher (Instant Speed ONLY)
  useEffect(() => {
    let subscription;
    let lastTime = Date.now();
    let lastSessionSteps = 0;

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

      subscription = Pedometer.watchStepCount((result) => {
        const now = Date.now();
        const deltaSteps = result.steps - lastSessionSteps;
        const deltaTimeSec = (now - lastTime) / 1000;

        if (deltaSteps > 0 && deltaTimeSec > 0 && strideLength > 0) {
          const deltaDistance = calculateDistance(deltaSteps, strideLength);
          const liveSpeed = calculateSpeed(deltaDistance, deltaTimeSec);

          // ONLY update local UI state here. No Redux dispatch!
          setInstantSpeed(liveSpeed);
        }

        lastSessionSteps = result.steps;
        lastTime = now;

        // Reset the live speed dial to 0 if no new steps come in for 3 seconds
        if (uiSittingTimer.current) clearTimeout(uiSittingTimer.current);
        uiSittingTimer.current = setTimeout(() => setInstantSpeed(0), 3000);
      });
    };

    subscribe();

    return () => {
      subscription?.remove();
      if (uiSittingTimer.current) clearTimeout(uiSittingTimer.current);
    };
  }, [strideLength]);

  const styles = makeStyles(theme, spacing, softShadow);

  return (
    <View style={styles.container}>
      {isPedometerAvailable === "checking" ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View style={{ opacity: fadeOpacity }}>
            <Animated.View style={slideTransform}>
              <Text style={styles.headerTitle}>Today's Activity</Text>
              <Text style={styles.headerSubtitle}>
                Keep going — every step counts
              </Text>
            </Animated.View>

            {/* Main progress card */}
            <Animated.View style={slideTransform}>
              <View style={styles.mainCard}>
                <View style={styles.mainCardTop}>
                  <View>
                    <Text style={styles.label}>Steps</Text>
                    <Text style={styles.mainValue}>{dailySteps}</Text>
                    <Text style={styles.subtext}>
                      Goal: {DAILY_GOAL.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.iconCircle}>
                    <Ionicons name="walk" size={26} color={theme.primary} />
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressPct * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  {Math.round(progressPct * 100)}% of daily goal
                </Text>
              </View>
            </Animated.View>

            {/* Quick stats */}
            <Animated.View style={slideTransform}>
              <View style={styles.statsGrid}>
                <View
                  style={[
                    styles.statCard,
                    { borderColor: theme.statOrange + "33" },
                  ]}
                >
                  <Ionicons name="flame" size={22} color={theme.statOrange} />
                  <Text style={styles.statLabel}>Calories</Text>
                  <Text style={[styles.statValue, { color: theme.statOrange }]}>
                    {caloriesBurned}
                  </Text>
                  <Text style={styles.statUnit}>kcal</Text>
                </View>

                <View
                  style={[
                    styles.statCard,
                    { borderColor: theme.statGreen + "33" },
                  ]}
                >
                  <Ionicons name="navigate" size={22} color={theme.statGreen} />
                  <Text style={styles.statLabel}>Distance</Text>
                  <Text style={[styles.statValue, { color: theme.statGreen }]}>
                    {(distanceMeters / 1000).toFixed(2)}
                  </Text>
                  <Text style={styles.statUnit}>km</Text>
                </View>
              </View>
            </Animated.View>

            {/* Live metrics */}
            <Animated.View style={slideTransform}>
              <View style={styles.liveMetricsContainer}>
                <Text style={styles.metricsTitle}>Live Metrics</Text>
                <View style={styles.metricRow}>
                  <View
                    style={[
                      styles.metricCard,
                      { borderColor: theme.statBlue + "33" },
                    ]}
                  >
                    <Ionicons
                      name="speedometer-outline"
                      size={18}
                      color={theme.statBlue}
                    />
                    <Text style={styles.metricName}>Speed</Text>
                    <Text
                      style={[styles.metricBigValue, { color: theme.statBlue }]}
                    >
                      {instantSpeed.toFixed(2)}
                    </Text>
                    <Text style={styles.metricUnitSmall}>m/s</Text>
                  </View>

                  <View
                    style={[
                      styles.metricCard,
                      { borderColor: theme.statPurple + "33" },
                    ]}
                  >
                    <Ionicons
                      name="pulse-outline"
                      size={18}
                      color={theme.statPurple}
                    />
                    <Text style={styles.metricName}>Intensity</Text>
                    <Text
                      style={[
                        styles.metricBigValue,
                        { color: theme.statPurple },
                      ]}
                    >
                      {liveMet.toFixed(1)}
                    </Text>
                    <Text style={styles.metricUnitSmall}>MET</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.metricCard,
                    styles.metricCardWide,
                    { borderColor: theme.statGreen + "33" },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={theme.statGreen}
                  />
                  <Text style={styles.metricName}>Active Time</Text>
                  <Text
                    style={[styles.metricBigValue, { color: theme.statGreen }]}
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
                </View>
              </View>
            </Animated.View>

            {/* Sensor status */}
            <Animated.View style={slideTransform}>
              <View style={styles.statusCard}>
                <Ionicons
                  name="hardware-chip-outline"
                  size={20}
                  color={theme.textSecondary}
                />
                <View style={styles.statusContent}>
                  <Text style={styles.statusLabel}>Sensor Status</Text>
                  <Text
                    style={[
                      styles.statusValue,
                      {
                        color:
                          isPedometerAvailable === "true"
                            ? theme.success
                            : theme.warning,
                      },
                    ]}
                  >
                    {isPedometerAvailable === "true" ? "Active" : "Unavailable"}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (theme, spacing, softShadow) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    loaderContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    headerTitle: { fontSize: 24, fontWeight: "800", color: theme.textPrimary },
    headerSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.xl,
      fontWeight: "500",
    },
    mainCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      ...softShadow(),
    },
    mainCardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: spacing.lg,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary + "1A",
      justifyContent: "center",
      alignItems: "center",
    },
    label: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: "700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginBottom: spacing.xs,
    },
    mainValue: { fontSize: 42, fontWeight: "900", color: theme.textPrimary },
    subtext: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: spacing.xs,
      fontWeight: "600",
    },
    progressTrack: {
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.bg3,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 5,
      backgroundColor: theme.primary,
    },
    progressLabel: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: spacing.sm,
      fontWeight: "600",
    },
    statsGrid: {
      flexDirection: "row",
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: spacing.lg,
      borderWidth: 1,
      minHeight: 120,
      gap: spacing.xs,
    },
    statLabel: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    statValue: { fontSize: 24, fontWeight: "900" },
    statUnit: { fontSize: 10, color: theme.textMuted, fontWeight: "600" },
    liveMetricsContainer: { marginBottom: spacing.lg },
    metricsTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.textPrimary,
      marginBottom: spacing.md,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    metricRow: {
      flexDirection: "row",
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    metricCard: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: spacing.lg,
      borderWidth: 1,
      gap: spacing.xs,
    },
    metricCardWide: { width: "100%" },
    metricName: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    metricBigValue: { fontSize: 26, fontWeight: "900" },
    metricUnitSmall: {
      fontSize: 11,
      color: theme.textMuted,
      fontWeight: "600",
    },
    statusCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      gap: spacing.md,
    },
    statusContent: { flex: 1 },
    statusLabel: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: "700",
      textTransform: "uppercase",
      marginBottom: spacing.xs,
    },
    statusValue: { fontSize: 14, fontWeight: "800" },
  });
