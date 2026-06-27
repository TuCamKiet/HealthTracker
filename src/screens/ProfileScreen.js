import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  ScrollView,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { auth, db } from "../services/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/slices/healthSlice";
import { colors, gradients, shadows, spacing } from "../utils/theme";
import {
  usePulseAnimation,
  useFadeInAnimation,
  useSlideInAnimation,
  useBounceAnimation,
} from "../utils/animations";

export default function ProfileScreen() {
  const dispatch = useDispatch();

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("male");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const userId = auth.currentUser?.uid;

  const { opacity: fadeOpacity } = useFadeInAnimation(200);
  const { transform: slideTransform1 } = useSlideInAnimation(true, 300);
  const { transform: slideTransform2 } = useSlideInAnimation(true, 400);
  const { opacity: pulseOpacity } = usePulseAnimation(2500);
  const { transform: bounceTransform, bounce } = useBounceAnimation();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.height) setHeight(data.height.toString());
          if (data.weight) setWeight(data.weight.toString());
          if (data.age) setAge(data.age.toString());
          if (data.sex) setSex(data.sex.toString());
        }
      } catch (error) {
        console.log("Lỗi khi tải dữ liệu:", error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchUserData();
  }, [userId]);

  const handleSaveProfile = async () => {
    if (!height || !weight || !age || !sex) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
      return;
    }

    setIsLoading(true);
    bounce();
    try {
      dispatch(
        setUserData({
          weight: parseFloat(weight),
          height: parseFloat(height),
          age: parseFloat(age),
          sex: sex,
        }),
      );

      const userRef = doc(db, "users", userId);
      await setDoc(
        userRef,
        {
          height: parseFloat(height),
          weight: parseFloat(weight),
          age: parseFloat(age),
          sex: sex,
          updatedAt: new Date(),
        },
        { merge: true },
      );

      setIsLoading(false);
      Alert.alert("Thành công", "Đã cập nhật dữ liệu ✅");
    } catch (error) {
      Alert.alert("Lỗi", "Không thể lưu dữ liệu: " + error.message);
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    signOut(auth).catch((error) => Alert.alert("Lỗi", error.message));
  };

  if (isFetching) {
    return (
      <LinearGradient
        colors={[colors.darkBg, colors.darkBg2]}
        style={styles.centerContainer}
      >
        <Animated.View
          style={[
            styles.loaderContainer,
            {
              transform: [
                {
                  scale: pulseOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.1],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[colors.neonCyan, colors.neonPurple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loaderGradient}
          >
            <ActivityIndicator color={colors.textPrimary} size="large" />
          </LinearGradient>
        </Animated.View>
      </LinearGradient>
    );
  }

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
          <View style={styles.header}>
            <Animated.View style={slideTransform1}>
              <Text style={styles.headerTitle}>PROFILE</Text>
              <Text style={styles.headerSubtitle}>
                Build Your Fitness Profile
              </Text>
            </Animated.View>
          </View>

          {/* Info Card */}
          <Animated.View style={slideTransform1}>
            <LinearGradient
              colors={[colors.darkBg2, colors.darkBg3]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.infoCard}
            >
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>⚙️</Text>
              </View>
              <Text style={styles.infoTitle}>Personal Information</Text>
              <Text style={styles.infoDescription}>
                Enter your details to personalize your fitness journey
              </Text>
            </LinearGradient>
          </Animated.View>

          {/* Height Input */}
          <Animated.View style={slideTransform1}>
            <View style={styles.inputSection}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>📏 Height (cm)</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{height || "0"} cm</Text>
                </View>
              </View>
              <LinearGradient
                colors={[colors.darkBg2, colors.darkBg3]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.inputContainer}
              >
                <TextInput
                  style={styles.input}
                  placeholder="170"
                  placeholderTextColor={colors.textMuted}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                />
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Weight Input */}
          <Animated.View style={slideTransform2}>
            <View style={styles.inputSection}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>⚖️ Weight (kg)</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{weight || "0"} kg</Text>
                </View>
              </View>
              <LinearGradient
                colors={[colors.darkBg2, colors.darkBg3]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.inputContainer}
              >
                <TextInput
                  style={styles.input}
                  placeholder="65"
                  placeholderTextColor={colors.textMuted}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                />
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Age Input */}
          <Animated.View style={slideTransform2}>
            <View style={styles.inputSection}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>🎂 Age (years)</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{age || "0"} yrs</Text>
                </View>
              </View>
              <LinearGradient
                colors={[colors.darkBg2, colors.darkBg3]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.inputContainer}
              >
                <TextInput
                  style={styles.input}
                  placeholder="25"
                  placeholderTextColor={colors.textMuted}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                />
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Gender Selection */}
          <Animated.View style={slideTransform2}>
            <View style={styles.inputSection}>
              <Text style={styles.label}>👥 Gender</Text>
              <View style={styles.genderContainer}>
                <Pressable
                  style={[
                    styles.genderButton,
                    sex === "male" && styles.genderButtonActive,
                  ]}
                  onPress={() => setSex("male")}
                >
                  <LinearGradient
                    colors={
                      sex === "male"
                        ? [colors.neonBlue, colors.neonCyan]
                        : [colors.darkBg3, colors.darkBg2]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.genderButtonGradient}
                  >
                    <Text style={styles.genderIcon}>👨</Text>
                    <Text style={styles.genderText}>Male</Text>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  style={[
                    styles.genderButton,
                    sex === "female" && styles.genderButtonActive,
                  ]}
                  onPress={() => setSex("female")}
                >
                  <LinearGradient
                    colors={
                      sex === "female"
                        ? [colors.neonMagenta, colors.neonPink]
                        : [colors.darkBg3, colors.darkBg2]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.genderButtonGradient}
                  >
                    <Text style={styles.genderIcon}>👩</Text>
                    <Text style={styles.genderText}>Female</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* BMI Info */}
          {height && weight && (
            <Animated.View style={slideTransform2}>
              <LinearGradient
                colors={[colors.neonGreen + "20", colors.neonCyan + "10"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bmiCard}
              >
                <View style={styles.bmiContent}>
                  <Text style={styles.bmiLabel}>📊 BMI Index</Text>
                  <Text style={styles.bmiValue}>
                    {(parseFloat(weight) / ((parseFloat(height) / 100) ** 2)).toFixed(1)}
                  </Text>
                  <Text style={styles.bmiStatus}>
                    {parseFloat(weight) / ((parseFloat(height) / 100) ** 2) < 18.5
                      ? "Underweight"
                      : parseFloat(weight) / ((parseFloat(height) / 100) ** 2) < 25
                      ? "Normal"
                      : "Overweight"}
                  </Text>
                </View>
                <View style={styles.bmiIcon}>
                  <Text style={styles.bmiIconText}>✨</Text>
                </View>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Save Button */}
          <Animated.View style={bounceTransform}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSaveProfile}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[colors.neonCyan, colors.neonPurple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.textPrimary} size="large" />
                ) : (
                  <>
                    <Text style={styles.buttonIcon}>💾</Text>
                    <Text style={styles.buttonText}>Save Profile</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Logout Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLogout}
            style={styles.logoutButtonContainer}
          >
            <LinearGradient
              colors={[colors.darkBg3, colors.darkBg2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoutButton}
            >
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={styles.logoutText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  loaderContainer: {
    width: 100,
    height: 100,
  },
  loaderGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.neonCyan,
  },
  header: {
    marginBottom: spacing.xxl,
    marginTop: spacing.lg,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: colors.neonCyan,
    letterSpacing: 2,
    textShadowColor: colors.neonCyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontWeight: "600",
    letterSpacing: 1,
  },
  infoCard: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.neonMagenta,
    borderOpacity: 0.2,
    ...shadows.soft,
  },
  infoBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.darkBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.neonPurple,
  },
  infoBadgeText: {
    fontSize: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  infoDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  inputSection: {
    marginBottom: spacing.xl,
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.neonCyan,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  badge: {
    backgroundColor: colors.darkBg3,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neonCyan,
    borderOpacity: 0.3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.neonCyan,
  },
  inputContainer: {
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.neonCyan,
    borderOpacity: 0.3,
    height: 54,
    justifyContent: "center",
    ...shadows.soft,
  },
  input: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  genderContainer: {
    flexDirection: "row",
    gap: spacing.md,
  },
  genderButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  genderButtonActive: {
    ...shadows.neonCyan,
  },
  genderButtonGradient: {
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  genderIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  genderText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  bmiCard: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.neonGreen,
    borderOpacity: 0.3,
    ...shadows.soft,
  },
  bmiContent: {
    flex: 1,
  },
  bmiLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  bmiValue: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.neonGreen,
    marginBottom: spacing.sm,
    textShadowColor: colors.neonGreen,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  bmiStatus: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  bmiIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.darkBg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.neonGreen,
  },
  bmiIconText: {
    fontSize: 28,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    borderRadius: 14,
    marginBottom: spacing.lg,
    ...shadows.neonCyan,
  },
  buttonIcon: {
    fontSize: 22,
    marginRight: spacing.md,
  },
  buttonText: {
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 1.5,
  },
  logoutButtonContainer: {
    marginBottom: spacing.xl,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.neonMagenta,
    borderOpacity: 0.4,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  logoutText: {
    color: colors.neonMagenta,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 1,
  },
});
