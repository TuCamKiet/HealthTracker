import React, { useState, useEffect } from "react";
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
  updateSteps,
  setUserData,
  resetDailyStats,
} from "../redux/slices/healthSlice";
import * as Notifications from "expo-notifications";
import { requestPermissionsAndSchedule } from "../services/notificationService";
import { Alert } from "react-native";

export default function DashboardScreen() {
  const dispatch = useDispatch();
  //! Lấy dữ liệu từ Redux Store
  const { dailySteps, caloriesBurned } = useSelector((state) => state.health);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState("checking");

  //!Notification
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

  //!Tải dữ liệu hồ sơ từ Firestore khi vừa vào Dashboard
  useEffect(() => {
    const loadCurrentSteps = async () => {
      const userId = auth.currentUser?.uid;

      if (!userId) return;

      const today = new Date().toISOString().split("T")[0];

      console.log(today);

      try {
        const currentRef = doc(db, "users", userId, "history", today);

        const currentSnap = await getDoc(currentRef);

        console.log("1", currentSnap, currentSnap.exists());

        if (!currentSnap.exists()) {
          return;
        }

        console.log("2");

        const data = currentSnap.data();

        console.log(
          data.date,
          " ",
          today,
          data.date !== today,
          data.steps,
          data,
        );

        if (data.date !== today) {
          dispatch(resetDailyStats());

          return;
        }

        dispatch(updateSteps(data.steps || 0));
      } catch (error) {
        console.log("Load current steps error:", error);
      }
    };

    loadCurrentSteps();
  }, [dispatch]);

  //! THÊM ĐOẠN NÀY ĐỂ LOG DỮ LIỆU THAY ĐỔI
  useEffect(() => {
    console.log(
      `[HealthTracker] Steps: ${dailySteps} | Calories: ${caloriesBurned} kcal`,
    );
  }, [dailySteps, caloriesBurned]);

  //! Hàm lấy tổng bước hôm nay
  const getTodaySteps = async () => {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date();

      const result = await Pedometer.getStepCountAsync(start, end);

      console.log("Today steps:", result.steps);

      dispatch(updateSteps(result.steps));
    } catch (error) {
      console.log("Get steps error:", error);
    }
  };

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

  //!Đếm bằng Pedometer
  useEffect(() => {
    let subscription;

    const subscribe = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();

      if (!isAvailable) return;

      subscription = Pedometer.watchStepCount(async () => {
        await getTodaySteps();
      });
    };

    subscribe();

    return () => {
      subscription?.remove();
    };
  }, [dispatch]);

  //!Tự động đồng bộ dữ liệu lên Firebase
  useEffect(() => {
    // Không lưu nếu số bước bằng 0
    if (dailySteps === 0) return;

    // Chờ 2 giây sau khi số bước ngừng thay đổi mới lưu để tiết kiệm lượt ghi (write)
    const timeoutId = setTimeout(async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Lấy ngày hôm nay theo định dạng YYYY-MM-DD
      const today = new Date().toISOString().split("T")[0];
      const historyRef = doc(db, "users", userId, "history", today);

      try {
        await setDoc(
          historyRef,
          {
            steps: dailySteps,
            calories: caloriesBurned,
            date: today, // Lưu lại chuỗi ngày để sau này sắp xếp
            updatedAt: new Date(),
          },
          { merge: true },
        );
        console.log(`Đã đồng bộ lên Cloud: ${dailySteps} bước`);
      } catch (error) {
        console.log("Lỗi đồng bộ dữ liệu:", error);
      }
    }, 2000);

    // Dọn dẹp timeout nếu người dùng tiếp tục đi bộ trước khi 2 giây kết thúc
    return () => clearTimeout(timeoutId);
  }, [dailySteps, caloriesBurned]);

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
          {/* test notify button */}
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
