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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { auth } from "../services/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { colors, gradients, shadows } from "../utils/theme";
import { usePulseAnimation, useBounceAnimation, useFadeInAnimation } from "../utils/animations";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const { opacity: pulseOpacity } = usePulseAnimation(2500);
  const { transform: bounceTransform, bounce } = useBounceAnimation();
  const { opacity: fadeOpacity } = useFadeInAnimation(300);

  const handleAuthentication = async () => {
    if (email === "" || password === "") {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ email và mật khẩu!");
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
            "Email chưa xác thực",
            "Vui lòng kiểm tra email và xác thực tài khoản trước khi đăng nhập.",
          );

          await signOut(auth);
          return;
        }

        Alert.alert("Thành công", "Đăng nhập thành công!");
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );

        await sendEmailVerification(userCredential.user);

        Alert.alert(
          "Xác thực Email",
          "Tài khoản đã được tạo. Vui lòng kiểm tra email để xác thực trước khi đăng nhập.",
        );

        await signOut(auth);

        setIsLogin(true);
      }
    } catch (error) {
      Alert.alert("Lỗi xác thực", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.darkBg, colors.darkBg2, colors.darkBg]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Animated Background Glow */}
      <Animated.View
        style={[
          styles.glowContainer,
          {
            opacity: pulseOpacity,
          },
        ]}
      >
        <LinearGradient
          colors={[colors.neonCyan, colors.neonMagenta]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glowGradient}
        />
      </Animated.View>

      <Animated.View style={[styles.contentWrapper, { opacity: fadeOpacity }]}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [
                  {
                    scale: pulseOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1.1],
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
              style={styles.iconGradient}
            >
              <Text style={styles.icon}>💪</Text>
            </LinearGradient>
          </Animated.View>

          <Text style={styles.title}>
            {isLogin ? "FIT ZONE" : "JOIN ZONE"}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin ? "Welcome Back, Champion" : "Start Your Journey"}
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email</Text>
            <LinearGradient
              colors={[colors.darkBg2, colors.darkBg3]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.inputContainer}
            >
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </LinearGradient>
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Password</Text>
            <LinearGradient
              colors={[colors.darkBg2, colors.darkBg3]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.inputContainer}
            >
              <Text style={styles.inputIcon}>🔐</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </LinearGradient>
          </View>

          {/* Main Action Button */}
          <Animated.View style={[styles.buttonWrapper, bounceTransform]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleAuthentication}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[colors.neonCyan, colors.neonMagenta]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.textPrimary} size="large" />
                ) : (
                  <>
                    <Text style={styles.buttonIcon}>
                      {isLogin ? "⚡" : "🚀"}
                    </Text>
                    <Text style={styles.buttonText}>
                      {isLogin ? "ENTER ZONE" : "CREATE ACCOUNT"}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          {/* Toggle Button */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setIsLogin(!isLogin)}
          >
            <LinearGradient
              colors={["transparent", "transparent"]}
              style={styles.toggleGradient}
            >
              <Text style={styles.toggleText}>
                {isLogin
                  ? "🔥 Don't have account? Sign Up"
                  : "⚡ Already have account? Login"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Train. Track. Transform.
          </Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  glowContainer: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    overflow: "hidden",
  },
  glowGradient: {
    width: "100%",
    height: "100%",
    opacity: 0.15,
  },
  contentWrapper: {
    zIndex: 1,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.neonCyan,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.neonCyan,
    marginBottom: 8,
    letterSpacing: 2,
    textShadowColor: colors.neonCyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 1,
  },
  formSection: {
    marginBottom: 30,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.neonCyan,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.neonCyan,
    borderOpacity: 0.3,
    height: 50,
    ...shadows.soft,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "500",
  },
  buttonWrapper: {
    marginTop: 30,
    marginBottom: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    ...shadows.neonCyan,
  },
  buttonIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  buttonText: {
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 1.5,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neonMagenta,
    opacity: 0.2,
  },
  dividerText: {
    color: colors.textMuted,
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: "600",
  },
  toggleButton: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.neonPurple,
    borderStyle: "dashed",
    alignItems: "center",
  },
  toggleGradient: {
    width: "100%",
    alignItems: "center",
  },
  toggleText: {
    color: colors.neonPurple,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
});
