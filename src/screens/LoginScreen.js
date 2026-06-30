import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { auth } from "../services/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { useTheme } from "../context/ThemeContext";
import { useFadeInAnimation, useBounceAnimation } from "../utils/animations";

export default function LoginScreen() {
  const { theme, spacing, softShadow } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { transform: bounceTransform, bounce } = useBounceAnimation();
  const { opacity: fadeOpacity } = useFadeInAnimation(150);

  const handleAuthentication = async () => {
    if (email === "" || password === "") {
      Alert.alert("Missing info", "Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    bounce();
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );

        await userCredential.user.reload();

        if (!userCredential.user.emailVerified) {
          Alert.alert(
            "Verify your email",
            "Please check your inbox and verify your account before logging in.",
          );
          await signOut(auth);
          return;
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );

        await sendEmailVerification(userCredential.user);

        Alert.alert(
          "Check your email",
          "Your account has been created. Please verify your email before logging in.",
        );

        await signOut(auth);
        setIsLogin(true);
      }
    } catch (error) {
      Alert.alert("Authentication error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const styles = makeStyles(theme, spacing, softShadow);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeOpacity }}>
            {/* Brand header */}
            <View style={styles.headerSection}>
              <LinearGradient
                colors={theme.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Ionicons name="barbell" size={36} color="#FFFFFF" />
              </LinearGradient>

              <Text style={styles.title}>FitTrack</Text>
              <Text style={styles.subtitle}>
                {isLogin
                  ? "Welcome back — let's keep moving"
                  : "Create your account and start training"}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formSection}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={theme.textMuted}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={theme.textMuted}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={theme.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={theme.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <Animated.View style={bounceTransform}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleAuthentication}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={theme.gradientPrimary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.button}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons
                          name={isLogin ? "log-in-outline" : "rocket-outline"}
                          size={20}
                          color="#FFFFFF"
                          style={{ marginRight: spacing.sm }}
                        />
                        <Text style={styles.buttonText}>
                          {isLogin ? "Log In" : "Create Account"}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setIsLogin(!isLogin)}
                activeOpacity={0.7}
              >
                <Text style={styles.toggleText}>
                  {isLogin
                    ? "Don't have an account? Sign Up"
                    : "Already have an account? Log In"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Train. Track. Transform.</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (theme, spacing, softShadow) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: "center",
      padding: spacing.xl,
    },
    headerSection: {
      alignItems: "center",
      marginBottom: spacing.xxl,
    },
    iconGradient: {
      width: 76,
      height: 76,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.lg,
      ...softShadow(),
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.textPrimary,
      letterSpacing: 0.5,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: spacing.sm,
      textAlign: "center",
      fontWeight: "500",
    },
    formSection: {
      marginBottom: spacing.xl,
    },
    inputWrapper: {
      marginBottom: spacing.lg,
    },
    inputLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: "700",
      marginBottom: spacing.sm,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 12,
      paddingHorizontal: spacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBg,
      height: 52,
      gap: spacing.sm,
    },
    input: {
      flex: 1,
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: "500",
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      borderRadius: 12,
      marginTop: spacing.sm,
      ...softShadow(),
    },
    buttonText: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: 16,
      letterSpacing: 0.5,
    },
    dividerContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: spacing.lg,
    },
    divider: {
      flex: 1,
      height: 1,
      backgroundColor: theme.divider,
    },
    dividerText: {
      color: theme.textMuted,
      marginHorizontal: spacing.md,
      fontSize: 12,
      fontWeight: "600",
    },
    toggleButton: {
      paddingVertical: spacing.md,
      alignItems: "center",
    },
    toggleText: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: "700",
    },
    footer: {
      alignItems: "center",
      marginTop: spacing.lg,
    },
    footerText: {
      fontSize: 12,
      color: theme.textMuted,
      letterSpacing: 0.5,
    },
  });
