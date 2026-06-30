import React, { useState, useEffect } from "react";
import { ActivityIndicator, View, TouchableOpacity, Text } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Ionicons from "@react-native-vector-icons/ionicons";

// Redux imports
import { Provider } from "react-redux";
import { store } from "./src/redux/store";

// Firebase imports
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./src/services/firebaseConfig";
// THAY ĐỔI: Dùng onSnapshot thay cho getDoc
import { doc, onSnapshot } from "firebase/firestore";

// Import Screens
import DashboardScreen from "./src/screens/DashboardScreen";
import LoginScreen from "./src/screens/LoginScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

import { colors, shadows } from "./src/utils/theme";

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  //Style
  const MyTheme = {
    ...DarkTheme,

    colors: {
      ...DarkTheme.colors,

      primary: colors.neonCyan,
      background: colors.darkBg,
      card: colors.darkBg2,
      text: colors.textPrimary,
      border: colors.darkBg3,
      notification: colors.neonMagenta,
    },
  };

  // Lắng nghe trạng thái đăng nhập từ Firebase
  useEffect(() => {
    let unsubProfile; // Biến dọn dẹp listener của Firestore

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);

        // THAY ĐỔI: Lắng nghe Real-time từ Firestore
        unsubProfile = onSnapshot(
          userRef,
          (userSnap) => {
            if (
              userSnap.exists() &&
              userSnap.data().height &&
              userSnap.data().weight
            ) {
              setHasProfile(true);
            } else {
              setHasProfile(false);
            }

            if (initializing) setInitializing(false);
          },
          (error) => {
            console.log("Lỗi kiểm tra profile:", error);
            setHasProfile(false);
            if (initializing) setInitializing(false);
          },
        );
      } else {
        setHasProfile(false);
        if (unsubProfile) unsubProfile(); // Tắt lắng nghe nếu đăng xuất
        if (initializing) setInitializing(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, [initializing]);

  // Hiển thị màn hình chờ
  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.darkBg,
        }}
      >
        <ActivityIndicator size="large" color={colors.neonCyan} />

        <Text
          style={{
            marginTop: 20,
            color: colors.textSecondary,
            letterSpacing: 2,
            fontWeight: "700",
          }}
        >
          INITIALIZING...
        </Text>
      </View>
    );
  }

  return (
    <Provider store={store}>
      <NavigationContainer theme={MyTheme}>
        <Stack.Navigator
          screenOptions={{
            animation: "slide_from_right",

            headerStyle: {
              backgroundColor: colors.darkBg2,
            },

            headerTintColor: colors.textPrimary,

            headerTitleStyle: {
              fontWeight: "900",
              fontSize: 18,
              letterSpacing: 1,
            },

            headerShadowVisible: false,

            contentStyle: {
              backgroundColor: colors.darkBg,
            },
          }}
        >
          {user ? (
            hasProfile ? (
              // LUỒNG 1: Đã đăng nhập VÀ Đã có thông tin hồ sơ
              <>
                <Stack.Screen
                  name="Dashboard"
                  component={DashboardScreen}
                  options={({ navigation }) => ({
                    title: "FIT ZONE",
                    headerTitleAlign: "center", // Locks the title in the center

                    headerStyle: {
                      backgroundColor: colors.darkBg2,
                    },

                    headerTintColor: colors.neonCyan,

                    headerTitleStyle: {
                      fontWeight: "900",
                      letterSpacing: 2,
                    },

                    headerShadowVisible: false,

                    // History Icon on the Left
                    headerLeft: () => (
                      <TouchableOpacity
                        style={{
                          marginLeft: 16,
                          padding: 8,
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: colors.neonCyan,
                          backgroundColor: "rgba(0,217,255,0.12)",
                          alignItems: "center",
                          justifyContent: "center",
                          ...shadows.soft,
                        }}
                        onPress={() => navigation.navigate("History")}
                      >
                        <Ionicons
                          name="time-outline"
                          size={15}
                          color={colors.neonCyan}
                        />
                      </TouchableOpacity>
                    ),

                    // Profile Icon on the Right
                    headerRight: () => (
                      <TouchableOpacity
                        style={{
                          marginRight: 16,
                          padding: 8,
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: colors.neonPurple,
                          backgroundColor: "rgba(139,92,246,0.12)",
                          alignItems: "center",
                          justifyContent: "center",
                          ...shadows.soft,
                        }}
                        onPress={() => navigation.navigate("Profile")}
                      >
                        <Ionicons
                          name="person-outline"
                          size={15}
                          color={colors.neonPurple}
                        />
                      </TouchableOpacity>
                    ),
                  })}
                />
                <Stack.Screen
                  name="Profile"
                  component={ProfileScreen}
                  options={{
                    title: "PROFILE",
                  }}
                />
                <Stack.Screen
                  name="History"
                  component={HistoryScreen}
                  options={{
                    title: "ACTIVITY HISTORY",
                  }}
                />
              </>
            ) : (
              // LUỒNG 2: Đã đăng nhập NHƯNG CHƯA có hồ sơ -> Ép buộc thiết lập
              <Stack.Screen
                name="ProfileSetup"
                component={ProfileScreen}
                options={{ title: "SETUP PROFILE" }}
              />
            )
          ) : (
            // LUỒNG 3: Chưa đăng nhập -> Hiển thị Login
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}
