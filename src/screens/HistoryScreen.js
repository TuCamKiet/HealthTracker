import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  dailySteps: 0,
  caloriesBurned: 0,
  weight: 65,
  height: 170,
};

export const healthSlice = createSlice({
  name: "health",
  initialState,
  reducers: {
    setUserData: (state, action) => {
      if (action.payload.weight) state.weight = action.payload.weight;
      if (action.payload.height) state.height = action.payload.height;
      // Không còn tự tính calo ở đây nữa vì HealthKit sẽ lo việc đó
    },
    updateSteps: (state, action) => {
      state.dailySteps = action.payload;
      // Không còn tự tính calo mỗi khi bước chân thay đổi nữa
    },
    // THÊM MỚI: Reducer cập nhật Calo trực tiếp từ HealthKit
    updateCalories: (state, action) => {
      state.caloriesBurned = parseFloat(action.payload.toFixed(2));
    },
    resetDailyStats: (state) => {
      state.dailySteps = 0;
      state.caloriesBurned = 0;
    },
  },
});

export const { updateSteps, updateCalories, resetDailyStats, setUserData } =
  healthSlice.actions;

export default healthSlice.reducer;

//! Ver expo go
// import React, { useState, useEffect } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   Dimensions,
//   ActivityIndicator,
//   TouchableOpacity,
// } from "react-native";
// import { BarChart } from "react-native-chart-kit";

// // Import Firebase
// import { auth, db } from "../services/firebaseConfig";
// import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

// export default function HistoryScreen() {
//   const [chartData, setChartData] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);

//   // State quản lý bộ lọc thời gian: 'week', 'month', 'year'
//   const [timeRange, setTimeRange] = useState("week");

//   useEffect(() => {
//     const fetchHistoryData = async () => {
//       setIsLoading(true);
//       const userId = auth.currentUser?.uid;
//       if (!userId) return;

//       try {
//         // 1. Xác định số lượng document cần tải dựa trên timeRange
//         let limitDays = 7;
//         if (timeRange === "month") limitDays = 30;
//         if (timeRange === "year") limitDays = 365;

//         const historyRef = collection(db, "users", userId, "history");
//         const q = query(historyRef, orderBy("date", "desc"), limit(limitDays));
//         const querySnapshot = await getDocs(q);

//         // Đưa dữ liệu thô vào mảng
//         let rawData = [];
//         querySnapshot.forEach((doc) => {
//           rawData.push(doc.data());
//         });

//         // Đảo ngược mảng để dữ liệu sắp xếp từ Cũ -> Mới
//         rawData.reverse();

//         let fetchedLabels = [];
//         let fetchedSteps = [];

//         // 2. Xử lý và gom nhóm dữ liệu (Aggregation)
//         if (rawData.length === 0) {
//           fetchedLabels = ["Chưa có dữ liệu"];
//           fetchedSteps = [0];
//         } else if (timeRange === "week") {
//           // TUẦN: Hiển thị 7 ngày gần nhất
//           rawData.forEach((data) => {
//             const dateParts = data.date.split("-");
//             fetchedLabels.push(`${dateParts[2]}/${dateParts[1]}`);
//             fetchedSteps.push(data.steps);
//           });
//         } else if (timeRange === "month") {
//           // THÁNG: Gom 30 ngày thành 4 nhóm (4 Tuần)
//           const weeks = [0, 0, 0, 0];
//           const chunkSize = Math.ceil(rawData.length / 4); // Chia đều dữ liệu thành 4 phần

//           rawData.forEach((data, index) => {
//             const weekIndex = Math.floor(index / chunkSize);
//             if (weekIndex < 4) {
//               weeks[weekIndex] += data.steps;
//             }
//           });
//           fetchedLabels = ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"];
//           fetchedSteps = weeks;
//         } else if (timeRange === "year") {
//           // NĂM: Gom 365 ngày thành 12 Tháng
//           const monthlyData = Array(12).fill(0);

//           rawData.forEach((data) => {
//             // Lấy tháng từ chuỗi YYYY-MM-DD (trừ 1 vì mảng bắt đầu từ 0)
//             const monthIndex = parseInt(data.date.split("-")[1], 10) - 1;
//             monthlyData[monthIndex] += data.steps;
//           });

//           fetchedLabels = [
//             "T1",
//             "T2",
//             "T3",
//             "T4",
//             "T5",
//             "T6",
//             "T7",
//             "T8",
//             "T9",
//             "T10",
//             "T11",
//             "T12",
//           ];
//           fetchedSteps = monthlyData;
//         }

//         setChartData({
//           labels: fetchedLabels,
//           datasets: [{ data: fetchedSteps }],
//         });
//       } catch (error) {
//         console.log("Lỗi tải lịch sử:", error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchHistoryData();
//   }, [timeRange]); // Gọi lại API và tính toán mỗi khi timeRange thay đổi

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Lịch sử Bước chân</Text>

//       {/* THANH ĐIỀU HƯỚNG CHỌN THỜI GIAN */}
//       <View style={styles.filterContainer}>
//         <TouchableOpacity
//           style={[
//             styles.filterBtn,
//             timeRange === "week" && styles.filterBtnActive,
//           ]}
//           onPress={() => setTimeRange("week")}
//         >
//           <Text
//             style={[
//               styles.filterText,
//               timeRange === "week" && styles.filterTextActive,
//             ]}
//           >
//             7 Ngày
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={[
//             styles.filterBtn,
//             timeRange === "month" && styles.filterBtnActive,
//           ]}
//           onPress={() => setTimeRange("month")}
//         >
//           <Text
//             style={[
//               styles.filterText,
//               timeRange === "month" && styles.filterTextActive,
//             ]}
//           >
//             30 Ngày
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={[
//             styles.filterBtn,
//             timeRange === "year" && styles.filterBtnActive,
//           ]}
//           onPress={() => setTimeRange("year")}
//         >
//           <Text
//             style={[
//               styles.filterText,
//               timeRange === "year" && styles.filterTextActive,
//             ]}
//           >
//             Năm Nay
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* HIỂN THỊ BIỂU ĐỒ HOẶC LOADING */}
//       {isLoading || !chartData ? (
//         <View style={styles.center}>
//           <ActivityIndicator size="large" color="#3B82F6" />
//         </View>
//       ) : (
//         <BarChart
//           data={chartData}
//           width={Dimensions.get("window").width - 40}
//           height={300}
//           yAxisLabel=""
//           yAxisSuffix=""
//           fromZero={true}
//           chartConfig={{
//             backgroundColor: "#ffffff",
//             backgroundGradientFrom: "#ffffff",
//             backgroundGradientTo: "#ffffff",
//             decimalPlaces: 0,
//             color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
//             labelColor: (opacity = 1) => `rgba(17, 24, 39, ${opacity})`,
//             style: { borderRadius: 16 },
//             barPercentage: timeRange === "year" ? 0.3 : 0.7, // Thu nhỏ cột nếu hiển thị cả 12 tháng
//           }}
//           style={{ marginVertical: 8, borderRadius: 16 }}
//         />
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//     backgroundColor: "#F5F7FA",
//     alignItems: "center",
//   },
//   center: {
//     height: 300, // Giữ chiều cao cố định để giao diện không bị giật khi loading
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: "bold",
//     marginBottom: 15,
//     color: "#111827",
//   },
//   filterContainer: {
//     flexDirection: "row",
//     backgroundColor: "#E5E7EB",
//     borderRadius: 8,
//     padding: 4,
//     marginBottom: 20,
//     width: "100%",
//   },
//   filterBtn: {
//     flex: 1,
//     paddingVertical: 8,
//     alignItems: "center",
//     borderRadius: 6,
//   },
//   filterBtnActive: {
//     backgroundColor: "#FFFFFF",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 2,
//     elevation: 2,
//   },
//   filterText: {
//     fontSize: 14,
//     color: "#6B7280",
//     fontWeight: "500",
//   },
//   filterTextActive: {
//     color: "#3B82F6",
//     fontWeight: "bold",
//   },
// });
