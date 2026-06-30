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
import { auth, db } from "../services/firebaseConfig";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
} from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import { useFadeInAnimation, useSlideInAnimation } from "../utils/animations";

export default function HistoryScreen() {
  const { theme, spacing, softShadow } = useTheme();
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("week");

  const { opacity: fadeOpacity } = useFadeInAnimation(150);
  const { transform: slideTransform } = useSlideInAnimation(true, 200);

  useEffect(() => {
    const fetchHistoryData = async () => {
      setIsLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      try {
        let limitDays = 7;
        if (timeRange === "month") limitDays = 30;
        if (timeRange === "year") limitDays = 365;

        const today = new Date();
        const currentDay = today.getDay();
        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const start = monday.toISOString().split("T")[0];
        const end = sunday.toISOString().split("T")[0];

        const historyRef = collection(db, "users", userId, "history");
        const q = query(
          historyRef,
          where("date", ">=", start),
          where("date", "<=", end),
          orderBy("date"),
        );
        const querySnapshot = await getDocs(q);

        let rawData = [];
        querySnapshot.forEach((doc) => rawData.push(doc.data()));
        rawData.reverse();

        let fetchedLabels = [];
        let fetchedSteps = [];

        if (rawData.length === 0) {
          fetchedLabels = ["No data"];
          fetchedSteps = [0];
        } else if (timeRange === "week") {
          // Create lookup table
          const stepMap = {};

          rawData.forEach((data) => {
            stepMap[data.date] = data.steps;
          });

          fetchedLabels = [];
          fetchedSteps = [];

          for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);

            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const dd = String(date.getDate()).padStart(2, "0");

            const key = `${yyyy}-${mm}-${dd}`;

            fetchedLabels.push(`${dd}/${mm}`);
            fetchedSteps.push(stepMap[key] ?? 0);
          }
        } else if (timeRange === "month") {
          const weeks = [0, 0, 0, 0];
          const chunkSize = Math.ceil(rawData.length / 4);
          rawData.forEach((data, index) => {
            const weekIndex = Math.floor(index / chunkSize);
            if (weekIndex < 4) weeks[weekIndex] += data.steps;
          });
          fetchedLabels = ["Wk 1", "Wk 2", "Wk 3", "Wk 4"];
          fetchedSteps = weeks;
        } else if (timeRange === "year") {
          const monthlyData = Array(12).fill(0);
          rawData.forEach((data) => {
            const monthIndex = parseInt(data.date.split("-")[1], 10) - 1;
            monthlyData[monthIndex] += data.steps;
          });
          fetchedLabels = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          fetchedSteps = monthlyData;
        }

        setChartData({
          labels: fetchedLabels,
          datasets: [{ data: fetchedSteps }],
        });
      } catch (error) {
        console.log("History load error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistoryData();
  }, [timeRange]);

  const styles = makeStyles(theme, spacing, softShadow);

  const chartColor = (opacity = 1) =>
    theme.mode === "dark"
      ? `rgba(19, 212, 155, ${opacity})`
      : `rgba(15, 185, 136, ${opacity})`;

  const labelColor = (opacity = 1) =>
    theme.mode === "dark"
      ? `rgba(154, 164, 178, ${opacity})`
      : `rgba(91, 100, 114, ${opacity})`;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeOpacity }}>
          <Animated.View style={slideTransform}>
            <Text style={styles.headerTitle}>History</Text>
            <Text style={styles.headerSubtitle}>
              Track your progress over time
            </Text>
          </Animated.View>

          <Animated.View style={slideTransform}>
            <View style={styles.filterContainer}>
              {["week", "month", "year"].map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.filterBtn,
                    timeRange === range && styles.filterBtnActive,
                  ]}
                  onPress={() => setTimeRange(range)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterText,
                      timeRange === range && styles.filterTextActive,
                    ]}
                  >
                    {range === "week"
                      ? "7 Days"
                      : range === "month"
                        ? "Month"
                        : "Year"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <Animated.View style={slideTransform}>
            {isLoading || !chartData ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={theme.primary} size="large" />
                <Text style={styles.loadingText}>Loading your history...</Text>
              </View>
            ) : (
              <View style={styles.chartCard}>
                <BarChart
                  data={chartData}
                  width={
                    Dimensions.get("window").width -
                    spacing.lg * 2 -
                    spacing.lg * 2
                  }
                  height={280}
                  yAxisLabel=""
                  yAxisSuffix=""
                  fromZero={true}
                  chartConfig={{
                    // ADD THESE TWO LINES:
                    backgroundGradientFrom: theme.card,
                    backgroundGradientTo: theme.card,
                    backgroundColor: "transparent", // Keep this transparent
                    decimalPlaces: 0,
                    color: chartColor,
                    labelColor: labelColor,
                    style: { borderRadius: 16 },
                    barPercentage: timeRange === "year" ? 0.3 : 0.7,
                    propsForBackgroundLines: {
                      stroke: theme.border,
                      strokeWidth: 1,
                      opacity: theme.mode === "dark" ? 0.4 : 0.6,
                    },
                  }}
                  style={{ marginVertical: spacing.sm, borderRadius: 16 }}
                />
              </View>
            )}
          </Animated.View>

          {chartData && !isLoading && (
            <Animated.View style={slideTransform}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total Steps</Text>
                    <Text style={styles.summaryValue}>
                      {chartData.datasets[0].data.reduce((a, b) => a + b, 0)}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Average</Text>
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
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme, spacing, softShadow) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: theme.textPrimary,
    },
    headerSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.xl,
      fontWeight: "500",
    },
    filterContainer: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.lg,
      backgroundColor: theme.bg3,
      borderRadius: 12,
      padding: 4,
    },
    filterBtn: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: "center",
      borderRadius: 9,
    },
    filterBtnActive: {
      backgroundColor: theme.card,
      ...softShadow(),
    },
    filterText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: "700",
    },
    filterTextActive: {
      color: theme.primary,
    },
    loadingCard: {
      borderRadius: 16,
      padding: spacing.xxl,
      alignItems: "center",
      justifyContent: "center",
      height: 280,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: spacing.lg,
    },
    loadingText: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: spacing.lg,
      fontWeight: "600",
    },
    chartCard: {
      borderRadius: 16,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      ...softShadow(),
    },
    summaryCard: {
      borderRadius: 16,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      ...softShadow(),
    },
    summaryRow: { flexDirection: "row", alignItems: "center" },
    summaryItem: { flex: 1, alignItems: "center" },
    divider: { width: 1, height: 44, backgroundColor: theme.divider },
    summaryLabel: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: "700",
      textTransform: "uppercase",
      marginBottom: spacing.sm,
    },
    summaryValue: {
      fontSize: 22,
      fontWeight: "900",
      color: theme.primary,
    },
  });
