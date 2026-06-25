import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Pedometer } from "expo-sensors";
import { useDispatch, useSelector } from "react-redux";
import { updateSteps } from "../redux/slices/healthSlice";

export default function DashboardScreen() {
  const dispatch = useDispatch();

  // Lấy dữ liệu từ Redux Store
  const { dailySteps, caloriesBurned } = useSelector((state) => state.health);

  const [isPedometerAvailable, setIsPedometerAvailable] = useState("checking");

  // THÊM ĐOẠN NÀY ĐỂ LOG DỮ LIỆU THAY ĐỔI
  useEffect(() => {
    console.log(
      `[HealthTracker] Steps: ${dailySteps} | Calories: ${caloriesBurned} kcal`,
    );
  }, [dailySteps, caloriesBurned]);

  useEffect(() => {
    let subscription;

    const subscribe = async () => {
      // 1. Check if the sensor is available
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(String(isAvailable));

      if (isAvailable) {
        // 2. Request permission to access activity data
        const { status } = await Pedometer.requestPermissionsAsync();

        if (status === "granted") {
          // 3. Listen to real-time step updates
          subscription = Pedometer.watchStepCount((result) => {
            // Gửi số bước chân mới lên Redux để cập nhật state toàn cục
            dispatch(updateSteps(result.steps));
          });
        }
      }
    };

    subscribe();

    // Cleanup memory when the component unmounts
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [dispatch]);

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

          <Text style={styles.sensorStatus}>
            Sensor Status:{" "}
            {isPedometerAvailable === "true" ? "Active" : "Unavailable"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA", // Màu nền sáng nhẹ
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
    elevation: 5, // Đổ bóng cho Android
  },
  label: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  value: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#111827",
    marginVertical: 5,
  },
  sensorStatus: {
    marginTop: 30,
    fontSize: 12,
    color: "#9CA3AF",
  },
});
