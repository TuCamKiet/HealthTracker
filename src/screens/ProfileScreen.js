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
import Ionicons from "@react-native-vector-icons/ionicons";
import { auth, db } from "../services/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/slices/healthSlice";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";
import { useFadeInAnimation, useBounceAnimation } from "../utils/animations";

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const { theme, spacing, softShadow } = useTheme();

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("male");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const userId = auth.currentUser?.uid;

  const { opacity: fadeOpacity } = useFadeInAnimation(150);
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
        console.log("Profile load error:", error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchUserData();
  }, [userId]);

  const handleSaveProfile = async () => {
    if (!height || !weight || !age || !sex) {
      Alert.alert("Missing info", "Please fill in all fields.");
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
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (error) {
      Alert.alert("Error", "Could not save profile: " + error.message);
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    signOut(auth).catch((error) => Alert.alert("Error", error.message));
  };

  const bmi =
    height && weight
      ? parseFloat(weight) / (parseFloat(height) / 100) ** 2
      : null;
  const bmiStatus = bmi
    ? bmi < 18.5
      ? "Underweight"
      : bmi < 25
        ? "Normal"
        : bmi < 30
          ? "Overweight"
          : "Obese"
    : "";

  const styles = makeStyles(theme, spacing, softShadow);

  if (isFetching) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeOpacity }}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>
              Build your fitness profile
            </Text>
          </View>

          {/* Appearance / theme toggle */}
          <View style={styles.section}>
            <ThemeToggle />
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoBadge}>
              <Ionicons
                name="person-circle-outline"
                size={26}
                color={theme.primary}
              />
            </View>
            <Text style={styles.infoTitle}>Personal Information</Text>
            <Text style={styles.infoDescription}>
              Enter your details to personalize your fitness journey and calorie
              calculations.
            </Text>
          </View>

          <View style={styles.inputSection}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Height</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{height || "0"} cm</Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="170"
                placeholderTextColor={theme.textMuted}
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputSection}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Weight</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{weight || "0"} kg</Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="65"
                placeholderTextColor={theme.textMuted}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputSection}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Age</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{age || "0"} yrs</Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="25"
                placeholderTextColor={theme.textMuted}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderContainer}>
              <Pressable
                style={[
                  styles.genderButton,
                  sex === "male" && styles.genderButtonActive,
                ]}
                onPress={() => setSex("male")}
              >
                <Ionicons
                  name="male"
                  size={22}
                  color={sex === "male" ? theme.primary : theme.textMuted}
                />
                <Text
                  style={[
                    styles.genderText,
                    sex === "male" && { color: theme.primary },
                  ]}
                >
                  Male
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.genderButton,
                  sex === "female" && styles.genderButtonActive,
                ]}
                onPress={() => setSex("female")}
              >
                <Ionicons
                  name="female"
                  size={22}
                  color={sex === "female" ? theme.primary : theme.textMuted}
                />
                <Text
                  style={[
                    styles.genderText,
                    sex === "female" && { color: theme.primary },
                  ]}
                >
                  Female
                </Text>
              </Pressable>
            </View>
          </View>

          {bmi && (
            <View style={styles.bmiCard}>
              <View style={styles.bmiContent}>
                <Text style={styles.bmiLabel}>BMI Index</Text>
                <Text style={styles.bmiValue}>{bmi.toFixed(1)}</Text>
                <Text style={styles.bmiStatus}>{bmiStatus}</Text>
              </View>
              <View style={styles.bmiIcon}>
                <Ionicons
                  name="fitness-outline"
                  size={26}
                  color={theme.success}
                />
              </View>
            </View>
          )}

          <Animated.View style={bounceTransform}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSaveProfile}
              disabled={isLoading}
              style={styles.button}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="save-outline"
                    size={20}
                    color="#FFFFFF"
                    style={{ marginRight: spacing.sm }}
                  />
                  <Text style={styles.buttonText}>Save Profile</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <Ionicons name="log-out-outline" size={18} color={theme.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme, spacing, softShadow) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.bg,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    header: { marginBottom: spacing.lg },
    headerTitle: {
      fontSize: 26,
      fontWeight: "800",
      color: theme.textPrimary,
    },
    headerSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: spacing.xs,
      fontWeight: "500",
    },
    section: { marginBottom: spacing.xl },
    infoCard: {
      borderRadius: 16,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      ...softShadow(),
    },
    infoBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.primary + "1A",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.textPrimary,
      marginBottom: spacing.sm,
    },
    infoDescription: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 18,
    },
    inputSection: { marginBottom: spacing.lg },
    labelContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    label: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.textPrimary,
    },
    badge: {
      backgroundColor: theme.bg3,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: 20,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.primary,
    },
    inputContainer: {
      borderRadius: 12,
      paddingHorizontal: spacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBg,
      height: 52,
      justifyContent: "center",
    },
    input: {
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    genderContainer: { flexDirection: "row", gap: spacing.md },
    genderButton: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: spacing.lg,
      alignItems: "center",
      gap: spacing.sm,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    genderButtonActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + "14",
    },
    genderText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.textSecondary,
    },
    bmiCard: {
      borderRadius: 16,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      marginTop: spacing.md,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      ...softShadow(),
    },
    bmiContent: { flex: 1 },
    bmiLabel: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: "700",
      textTransform: "uppercase",
      marginBottom: spacing.sm,
    },
    bmiValue: {
      fontSize: 28,
      fontWeight: "900",
      color: theme.success,
      marginBottom: spacing.xs,
    },
    bmiStatus: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: "600",
    },
    bmiIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.success + "1A",
      justifyContent: "center",
      alignItems: "center",
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.lg,
      borderRadius: 14,
      marginBottom: spacing.md,
      backgroundColor: theme.primary,
      ...softShadow(),
    },
    buttonText: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: 16,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.lg,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.error + "55",
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    logoutText: {
      color: theme.error,
      fontWeight: "700",
      fontSize: 15,
    },
  });
