import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import { LinearGradient } from "expo-linear-gradient";

// Import Firebase
import { auth, db } from "../services/firebaseConfig";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { colors, spacing, shadows } from "../utils/theme";
import {
  usePulseAnimation,
  useFadeInAnimation,
  useSlideInAnimation,
} from "../utils/animations";

export default function HistoryScreen() {
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // State quản lý bộ lọc thời gian: 'week', 'month', 'year'
  const [timeRange, setTimeRange] = useState("week");

  //style
  const { opacity: fadeOpacity } = useFadeInAnimation(200);
  const { transform: slideTransform } = useSlideInAnimation(true, 300);
  const { opacity: pulseOpacity } = usePulseAnimation(2500);

  useEffect(() => {
    const fetchHistoryData = async () => {
      setIsLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      try {
        // 1. Xác định số lượng document cần tải dựa trên timeRange
        let limitDays = 7;
        if (timeRange === "month") limitDays = 30;
        if (timeRange === "year") limitDays = 365;

        const historyRef = collection(db, "users", userId, "history");
        const q = query(historyRef, orderBy("date", "desc"), limit(limitDays));
        const querySnapshot = await getDocs(q);

        // Đưa dữ liệu thô vào mảng
        let rawData = [];
        querySnapshot.forEach((doc) => {
          rawData.push(doc.data());
        });

        // Đảo ngược mảng để dữ liệu sắp xếp từ Cũ -> Mới
        rawData.reverse();

        let fetchedLabels = [];
        let fetchedSteps = [];

        // 2. Xử lý và gom nhóm dữ liệu (Aggregation)
        if (rawData.length === 0) {
          fetchedLabels = ["Chưa có dữ liệu"];
          fetchedSteps = [0];
        } else if (timeRange === "week") {
          // TUẦN: Hiển thị 7 ngày gần nhất
          rawData.forEach((data) => {
            const dateParts = data.date.split("-");
            fetchedLabels.push(`${dateParts[2]}/${dateParts[1]}`);
            fetchedSteps.push(data.steps);
          });
        } else if (timeRange === "month") {
          // THÁNG: Gom 30 ngày thành 4 nhóm (4 Tuần)
          const weeks = [0, 0, 0, 0];
          const chunkSize = Math.ceil(rawData.length / 4); // Chia đều dữ liệu thành 4 phần

          rawData.forEach((data, index) => {
            const weekIndex = Math.floor(index / chunkSize);
            if (weekIndex < 4) {
              weeks[weekIndex] += data.steps;
            }
          });
          fetchedLabels = ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"];
          fetchedSteps = weeks;
        } else if (timeRange === "year") {
          // NĂM: Gom 365 ngày thành 12 Tháng
          const monthlyData = Array(12).fill(0);

          rawData.forEach((data) => {
            // Lấy tháng từ chuỗi YYYY-MM-DD (trừ 1 vì mảng bắt đầu từ 0)
            const monthIndex = parseInt(data.date.split("-")[1], 10) - 1;
            monthlyData[monthIndex] += data.steps;
          });

          fetchedLabels = [
            "T1",
            "T2",
            "T3",
            "T4",
            "T5",
            "T6",
            "T7",
            "T8",
            "T9",
            "T10",
            "T11",
            "T12",
          ];
          fetchedSteps = monthlyData;
        }

        setChartData({
          labels: fetchedLabels,
          datasets: [{ data: fetchedSteps }],
        });
      } catch (error) {
        console.log("Lỗi tải lịch sử:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistoryData();
  }, [timeRange]); // Gọi lại API và tính toán mỗi khi timeRange thay đổi

  return (
    <LinearGradient
      colors={[colors.darkBg, colors.darkBg2, colors.darkBg]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeOpacity }}>
          {/* Header */}
          <Animated.View style={slideTransform}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>HISTORY</Text>
              <Text style={styles.headerSubtitle}>
                Track Your Progress Over Time
              </Text>
            </View>
          </Animated.View>

          {/* Time Filter Buttons */}
          <Animated.View style={slideTransform}>
            <View style={styles.filterContainer}>
              {["week", "month", "year"].map((range, index) => (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.filterBtn,
                    timeRange === range && styles.filterBtnActive,
                  ]}
                  onPress={() => setTimeRange(range)}
                >
                  <LinearGradient
                    colors={
                      timeRange === range
                        ? [colors.neonCyan, colors.neonPurple]
                        : [colors.darkBg3, colors.darkBg2]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.filterBtnGradient}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        timeRange === range && styles.filterTextActive,
                      ]}
                    >
                      {range === "week"
                        ? "7 Ngày"
                        : range === "month"
                          ? "30 Ngày"
                          : "Năm"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Chart Section */}
          <Animated.View style={slideTransform}>
            {isLoading || !chartData ? (
              <LinearGradient
                colors={[colors.darkBg2, colors.darkBg3]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.loadingCard}
              >
                <Animated.View
                  style={{
                    opacity: pulseOpacity,
                  }}
                >
                  <ActivityIndicator color={colors.neonCyan} size="large" />
                </Animated.View>
                <Text style={styles.loadingText}>Loading your history...</Text>
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={[colors.darkBg2, colors.darkBg3]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.chartCard}
              >
                <BarChart
                  data={chartData}
                  width={Dimensions.get("window").width - spacing.lg * 2 - 8}
                  height={300}
                  yAxisLabel=""
                  yAxisSuffix=""
                  fromZero={true}
                  chartConfig={{
                    backgroundColor: "transparent",
                    backgroundGradientFrom: "transparent",
                    backgroundGradientTo: "transparent",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 217, 255, ${opacity})`,
                    labelColor: (opacity = 1) =>
                      `rgba(176, 184, 212, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    barPercentage: timeRange === "year" ? 0.3 : 0.7,
                    propsForBackgroundLines: {
                      stroke: colors.darkBg3,
                      strokeWidth: 1,
                      opacity: 0.3,
                    },
                  }}
                  style={{ marginVertical: spacing.lg, borderRadius: 16 }}
                />
              </LinearGradient>
            )}
          </Animated.View>

          {/* Stats Summary */}
          {chartData && !isLoading && (
            <Animated.View style={slideTransform}>
              <LinearGradient
                colors={[colors.darkBg2, colors.darkBg3]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.summaryCard}
              >
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>📊 Total Steps</Text>
                    <Text style={styles.summaryValue}>
                      {chartData.datasets[0].data.reduce((a, b) => a + b, 0)}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>📈 Average</Text>
                    <Text style={styles.summaryValue}>
                      {Math.round(
                        chartData.datasets[0].data.reduce((a, b) => a + b, 0) /
                          (chartData.datasets[0].data.length !== 12 &&
                          chartData.datasets[0].data.length !== 4
                            ? 7
                            : chartData.datasets[0].data.length),
                      )}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  filterContainer: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  filterBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  filterBtnActive: {
    ...shadows.neonCyan,
  },
  filterBtnGradient: {
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.neonCyan,
    borderOpacity: 0.3,
  },
  filterText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  filterTextActive: {
    color: colors.textPrimary,
    fontWeight: "800",
  },
  loadingCard: {
    borderRadius: 16,
    padding: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
    height: 300,
    borderWidth: 1,
    borderColor: colors.neonCyan,
    borderOpacity: 0.2,
    marginBottom: spacing.xl,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  chartCard: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.neonCyan,
    borderOpacity: 0.2,
    ...shadows.soft,
  },
  summaryCard: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.neonMagenta,
    borderOpacity: 0.2,
    ...shadows.soft,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  divider: {
    width: 1,
    height: 50,
    backgroundColor: colors.neonMagenta,
    opacity: 0.2,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.neonMagenta,
    textShadowColor: colors.neonMagenta,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
