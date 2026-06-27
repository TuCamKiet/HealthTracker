import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
  Alert,
} from "react-native";
import AppleHealthKit from "react-native-health";
import { useDispatch, useSelector } from "react-redux";
import { auth, db } from "../services/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  updateSteps,
  updateCalories, // Import action mới thêm
  resetDailyStats,
} from "../redux/slices/healthSlice";
import * as Notifications from "expo-notifications";
import { requestPermissionsAndSchedule } from "../services/notificationService";

export default function DashboardScreen() {
  const dispatch = useDispatch();

  const { dailySteps, caloriesBurned } = useSelector((state) => state.health);
  const [isHealthKitAvailable, setIsHealthKitAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [hasNotified2k, setHasNotified2k] = useState(false);
  const [hasNotified5k, setHasNotified5k] = useState(false);

  //! Notification
  useEffect(() => {
    requestPermissionsAndSchedule();

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data.type === "WATER_REMINDER") {
          Alert.alert("💧 Uống nước", "Bạn đã uống nước chưa?");
        }
        if (data.type === "MOVE_REMINDER") {
          Alert.alert("🏃‍♂️ Vận động", "Đi bộ vài bước nhé!");
        }
      });

    return () => {
      responseListener.remove();
    };
  }, []);

  //! Khởi tạo Apple HealthKit & Xin quyền
  useEffect(() => {
    const permissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.StepCount,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned, // Thêm quyền đọc Calo
        ],
        write: [],
      },
    };

    AppleHealthKit.initHealthKit(permissions, (error) => {
      if (error) {
        console.log("[ERROR] Không thể lấy quyền HealthKit!", error);
        Alert.alert(
          "Lỗi quyền",
          "Vui lòng cấp quyền Sức khỏe trong Cài đặt iPhone.",
        );
        setIsLoading(false);
        return;
      }
      setIsHealthKitAvailable(true);
      setIsLoading(false);
      fetchHealthData();
    });
  }, []);

  //! Hàm gom chung việc lấy Bước chân và Calo từ HealthKit
  const fetchHealthData = () => {
    const today = new Date();

    // 1. Lấy số bước chân
    const stepOptions = {
      date: today.toISOString(),
    };

    AppleHealthKit.getStepCount(stepOptions, (err, results) => {
      if (err) {
        console.log("Lỗi tải bước chân:", err);
        return;
      }
      if (results && results.value !== undefined) {
        dispatch(updateSteps(results.value));
      }
    });

    // 2. Lấy tổng Calo tiêu thụ (Bắt đầu từ 0h00 hôm nay)
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const energyOptions = {
      startDate: startOfDay,
      endDate: new Date().toISOString(),
    };

    AppleHealthKit.getActiveEnergyBurned(energyOptions, (err, results) => {
      if (err) {
        console.log("Lỗi tải Calo:", err);
        return;
      }
      if (results && results.length > 0) {
        // HealthKit trả về mảng các phiên đốt calo -> Tính tổng
        const totalCalories = results.reduce(
          (sum, record) => sum + record.value,
          0,
        );
        dispatch(updateCalories(totalCalories));
      } else {
        dispatch(updateCalories(0));
      }
    });
  };

  //! Polling: Liên tục cập nhật dữ liệu khi người dùng đang mở app
  useEffect(() => {
    if (!isHealthKitAvailable) return;

    // Cập nhật lại số liệu mỗi 5 giây
    const intervalId = setInterval(() => {
      fetchHealthData();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isHealthKitAvailable]);

  //! Kích hoạt thông báo tức thì dựa trên mốc bước chân
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

  //! Tự động đồng bộ dữ liệu lên Firebase
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
            date: today,
            updatedAt: new Date(),
          },
          { merge: true },
        );
        console.log(
          `Đã đồng bộ lên Cloud: ${dailySteps} bước | ${caloriesBurned} kcal`,
        );
      } catch (error) {
        console.log("Lỗi đồng bộ dữ liệu:", error);
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [dailySteps, caloriesBurned]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 10, color: "#6B7280" }}>
          Đang kết nối Apple Health...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statsCard}>
        <Text style={styles.label}>Today's Steps</Text>
        <Text style={styles.value}>{dailySteps}</Text>

        <Text style={styles.label}>Calories Burned</Text>
        <Text style={styles.value}>{caloriesBurned} kcal</Text>

        <Text style={styles.sensorStatus}>
          Source: {isHealthKitAvailable ? "Apple HealthKit 🍏" : "Unavailable"}
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

//!Version expo go
// import React, { useState, useEffect } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   ActivityIndicator,
//   Button,
// } from "react-native";
// import { Pedometer } from "expo-sensors";
// import { useDispatch, useSelector } from "react-redux";
// import { auth, db } from "../services/firebaseConfig";
// import { doc, getDoc, setDoc } from "firebase/firestore";
// import {
//   updateSteps,
//   setUserData,
//   resetDailyStats,
// } from "../redux/slices/healthSlice";
// import * as Notifications from "expo-notifications";
// import { requestPermissionsAndSchedule } from "../services/notificationService";
// import { Alert } from "react-native";

// export default function DashboardScreen() {
//   const dispatch = useDispatch();
//   //! Lấy dữ liệu từ Redux Store
//   const { dailySteps, caloriesBurned } = useSelector((state) => state.health);
//   const [isPedometerAvailable, setIsPedometerAvailable] = useState("checking");
//   //! Dùng để đo số bước chân để thông báo nghỉ ngơi và uống nước
//   const [hasNotified2k, setHasNotified2k] = useState(false);
//   const [hasNotified5k, setHasNotified5k] = useState(false);

//   //!Notification
//   useEffect(() => {
//     requestPermissionsAndSchedule();

//     const receivedListener = Notifications.addNotificationReceivedListener(
//       (notification) => {
//         console.log("RECEIVED:", notification);
//       },
//     );

//     const responseListener =
//       Notifications.addNotificationResponseReceivedListener((response) => {
//         const data = response.notification.request.content.data;

//         console.log("CLICKED:", data);

//         if (data.type === "WATER_REMINDER") {
//           Alert.alert("💧 Uống nước", "Bạn đã uống nước chưa?");
//         }

//         if (data.type === "MOVE_REMINDER") {
//           Alert.alert("🏃‍♂️ Vận động", "Đi bộ vài bước nhé!");
//         }
//       });

//     return () => {
//       receivedListener.remove();
//       responseListener.remove();
//     };
//   }, []);

//   //!Tải dữ liệu hồ sơ từ Firestore khi vừa vào Dashboard
//   useEffect(() => {
//     const loadCurrentSteps = async () => {
//       const userId = auth.currentUser?.uid;

//       if (!userId) return;

//       const today = new Date().toISOString().split("T")[0];

//       console.log(today);

//       try {
//         const currentRef = doc(db, "users", userId, "history", today);

//         const currentSnap = await getDoc(currentRef);

//         console.log("1", currentSnap, currentSnap.exists());

//         if (!currentSnap.exists()) {
//           return;
//         }

//         console.log("2");

//         const data = currentSnap.data();

//         console.log(
//           data.date,
//           " ",
//           today,
//           data.date !== today,
//           data.steps,
//           data,
//         );

//         if (data.date !== today) {
//           dispatch(resetDailyStats());

//           return;
//         }

//         dispatch(updateSteps(data.steps || 0));
//       } catch (error) {
//         console.log("Load current steps error:", error);
//       }
//     };

//     loadCurrentSteps();
//   }, [dispatch]);

//   //! THÊM ĐOẠN NÀY ĐỂ LOG DỮ LIỆU THAY ĐỔI
//   useEffect(() => {
//     console.log(
//       `[HealthTracker] Steps: ${dailySteps} | Calories: ${caloriesBurned} kcal`,
//     );
//   }, [dailySteps, caloriesBurned]);

//   //! Hàm lấy tổng bước hôm nay
//   const getTodaySteps = async () => {
//     try {
//       const start = new Date();
//       start.setHours(0, 0, 0, 0);

//       const end = new Date();

//       const result = await Pedometer.getStepCountAsync(start, end);

//       console.log("Today steps:", result.steps);

//       dispatch(updateSteps(result.steps));
//     } catch (error) {
//       console.log("Get steps error:", error);
//     }
//   };

//   useEffect(() => {
//     const initialize = async () => {
//       const isAvailable = await Pedometer.isAvailableAsync();

//       setIsPedometerAvailable(String(isAvailable));

//       if (!isAvailable) return;

//       const { status } = await Pedometer.requestPermissionsAsync();

//       if (status !== "granted") return;

//       await getTodaySteps();
//     };

//     initialize();
//   }, []);

//   //!Đếm bằng Pedometer
//   useEffect(() => {
//     let subscription;

//     const subscribe = async () => {
//       const isAvailable = await Pedometer.isAvailableAsync();

//       if (!isAvailable) return;

//       subscription = Pedometer.watchStepCount(async () => {
//         await getTodaySteps();
//       });
//     };

//     subscribe();

//     return () => {
//       subscription?.remove();
//     };
//   }, [dispatch]);

//   //! Kích hoạt thông báo tức thì dựa trên mốc bước chân (Khoa học thể thao)
//   useEffect(() => {
//     const triggerStepBasedNotification = async () => {
//       // Mốc 1: 2000 bước -> Nhắc bù nước sau vận động
//       if (dailySteps >= 2000 && dailySteps < 5000 && !hasNotified2k) {
//         await Notifications.scheduleNotificationAsync({
//           content: {
//             title: "🚰 Cơ thể đang mất nước!",
//             body: `Bạn đã đi được ${dailySteps} bước. Hãy uống một ngụm nước để bù khoáng nhé!`,
//             data: { type: "WATER_ACTIVITY_REMINDER" },
//           },
//           trigger: null, // trigger null nghĩa là bắn thông báo NGAY LẬP TỨC
//         });
//         setHasNotified2k(true); // Đánh dấu đã nhắc để không bị spam
//       }

//       // Mốc 2: 5000 bước liên tục -> Nhắc nghỉ ngơi tránh quá tải khớp
//       if (dailySteps >= 5000 && !hasNotified5k) {
//         await Notifications.scheduleNotificationAsync({
//           content: {
//             title: "🧘‍♂️ Tới giờ nghỉ ngơi rồi!",
//             body: `Tuyệt vời! ${dailySteps} bước là một quãng đường dài. Hãy ngồi nghỉ 5-10 phút để cơ bắp phục hồi nhé.`,
//             data: { type: "REST_REMINDER" },
//           },
//           trigger: null,
//         });
//         setHasNotified5k(true);
//       }
//     };

//     triggerStepBasedNotification();
//   }, [dailySteps]);

//   //!Tự động đồng bộ dữ liệu lên Firebase
//   useEffect(() => {
//     // Không lưu nếu số bước bằng 0
//     if (dailySteps === 0) return;

//     // Chờ 2 giây sau khi số bước ngừng thay đổi mới lưu để tiết kiệm lượt ghi (write)
//     const timeoutId = setTimeout(async () => {
//       const userId = auth.currentUser?.uid;
//       if (!userId) return;

//       // Lấy ngày hôm nay theo định dạng YYYY-MM-DD
//       const today = new Date().toISOString().split("T")[0];
//       const historyRef = doc(db, "users", userId, "history", today);

//       try {
//         await setDoc(
//           historyRef,
//           {
//             steps: dailySteps,
//             calories: caloriesBurned,
//             date: today, // Lưu lại chuỗi ngày để sau này sắp xếp
//             updatedAt: new Date(),
//           },
//           { merge: true },
//         );
//         console.log(`Đã đồng bộ lên Cloud: ${dailySteps} bước`);
//       } catch (error) {
//         console.log("Lỗi đồng bộ dữ liệu:", error);
//       }
//     }, 2000);

//     // Dọn dẹp timeout nếu người dùng tiếp tục đi bộ trước khi 2 giây kết thúc
//     return () => clearTimeout(timeoutId);
//   }, [dailySteps, caloriesBurned]);

//   return (
//     <View style={styles.container}>
//       {isPedometerAvailable === "checking" ? (
//         <ActivityIndicator size="large" color="#0000ff" />
//       ) : (
//         <View style={styles.statsCard}>
//           <Text style={styles.label}>Today's Steps</Text>
//           <Text style={styles.value}>{dailySteps}</Text>

//           <Text style={styles.label}>Calories Burned</Text>
//           <Text style={styles.value}>{caloriesBurned} kcal</Text>

//           <Text style={styles.sensorStatus}>
//             Sensor Status:{" "}
//             {isPedometerAvailable === "true" ? "Active" : "Unavailable"}
//           </Text>
//           {/* test notify button */}
//           <Button
//             title="Test Notification"
//             onPress={async () => {
//               await Notifications.scheduleNotificationAsync({
//                 content: {
//                   title: "TEST",
//                   body: "Hello World",
//                 },
//                 trigger: null,
//               });
//             }}
//           />
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#F5F7FA", // Màu nền sáng nhẹ
//     alignItems: "center",
//     justifyContent: "center",
//     padding: 20,
//   },
//   statsCard: {
//     backgroundColor: "#FFFFFF",
//     padding: 30,
//     borderRadius: 15,
//     width: "100%",
//     alignItems: "center",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 5, // Đổ bóng cho Android
//   },
//   label: {
//     fontSize: 16,
//     color: "#6B7280",
//     marginTop: 15,
//     textTransform: "uppercase",
//     letterSpacing: 1,
//   },
//   value: {
//     fontSize: 48,
//     fontWeight: "bold",
//     color: "#111827",
//     marginVertical: 5,
//   },
//   sensorStatus: {
//     marginTop: 30,
//     fontSize: 12,
//     color: "#9CA3AF",
//   },
// });
