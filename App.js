import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  View,
  TouchableOpacity,
  Text,
  Alert,
} from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Ionicons from "@react-native-vector-icons/ionicons";

// Redux imports
import { Provider, useDispatch } from "react-redux";
import { store } from "./src/redux/store";
import { setUserData } from "./src/redux/slices/healthSlice";

// Theme
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";

// Firebase imports
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./src/services/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

// Session
import AsyncStorage from "@react-native-async-storage/async-storage";
const SESSION_KEY = "@session_id";

// Background tracking
import {
  registerBackgroundStepTask,
  unregisterBackgroundStepTask,
} from "./src/services/backgroundStepTask";

// Screens
import DashboardScreen from "./src/screens/DashboardScreen";
import LoginScreen from "./src/screens/LoginScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import HealthMonitor from "./src/components/HealthMonitor";

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { theme, isDark } = useTheme();
  const dispatch = useDispatch();

  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  const NavTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: theme.primary,
      background: theme.bg,
      card: theme.bg2,
      text: theme.textPrimary,
      border: theme.border,
      notification: theme.secondary,
    },
  };

  useEffect(() => {
    let unsubProfile;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        registerBackgroundStepTask();

        const userRef = doc(db, "users", currentUser.uid);

        unsubProfile = onSnapshot(
          userRef,
          async (userSnap) => {
            if (!userSnap.exists()) {
              setHasProfile(false);
              if (initializing) setInitializing(false);
              return;
            }

            const data = userSnap.data();

            // ---- Single-device session check ----
            // If Firestore has a sessionId, compare it to what this device
            // stored locally at login time. A mismatch means another device
            // logged in after us — sign this device out immediately.
            if (data.sessionId) {
              const localSessionId = await AsyncStorage.getItem(SESSION_KEY);
              if (localSessionId && data.sessionId !== localSessionId) {
                await AsyncStorage.removeItem(SESSION_KEY);
                await signOut(auth);
                Alert.alert(
                  "Signed out",
                  "Your account was signed in on another device.",
                );
                return; // onAuthStateChanged will fire again with null
              }
            }

            if (data.height && data.weight) {
              dispatch(
                setUserData({
                  height: data.height,
                  weight: data.weight,
                  age: data.age,
                  sex: data.sex,
                }),
              );
              setHasProfile(true);
            } else {
              setHasProfile(false);
            }

            if (initializing) setInitializing(false);
          },
          (error) => {
            console.log("Profile check error:", error);
            setHasProfile(false);
            if (initializing) setInitializing(false);
          },
        );
      } else {
        setHasProfile(false);
        unregisterBackgroundStepTask();
        if (unsubProfile) unsubProfile();
        if (initializing) setInitializing(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, [initializing, dispatch]);

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.bg,
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <Text
          style={{
            marginTop: 16,
            color: theme.textSecondary,
            letterSpacing: 0.5,
            fontWeight: "600",
            fontSize: 13,
          }}
        >
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={NavTheme}>
      {/* The brain runs globally here — covers foreground tracking on any screen */}
      {user && <HealthMonitor />}
      <Stack.Navigator
        screenOptions={{
          animation: "slide_from_right",
          headerStyle: { backgroundColor: theme.bg2 },
          headerTintColor: theme.textPrimary,
          headerTitleStyle: { fontWeight: "800", fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        {user ? (
          hasProfile ? (
            <>
              <Stack.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={({ navigation }) => ({
                  title: "FitTrack",
                  headerTitleAlign: "center",
                  headerLeft: () => (
                    <TouchableOpacity
                      style={{
                        marginLeft: 12,
                        padding: 8,
                        borderRadius: 18,
                        backgroundColor: theme.primary + "1A",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onPress={() => navigation.navigate("History")}
                    >
                      <Ionicons
                        name="time-outline"
                        size={17}
                        color={theme.primary}
                      />
                    </TouchableOpacity>
                  ),
                  headerRight: () => (
                    <TouchableOpacity
                      style={{
                        marginRight: 12,
                        padding: 8,
                        borderRadius: 18,
                        backgroundColor: theme.secondary + "1A",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onPress={() => navigation.navigate("Profile")}
                    >
                      <Ionicons
                        name="person-outline"
                        size={17}
                        color={theme.secondary}
                      />
                    </TouchableOpacity>
                  ),
                })}
              />
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: "Profile" }}
              />
              <Stack.Screen
                name="History"
                component={HistoryScreen}
                options={{ title: "Activity History" }}
              />
            </>
          ) : (
            <Stack.Screen
              name="ProfileSetup"
              component={ProfileScreen}
              options={{ title: "Setup Profile" }}
            />
          )
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </Provider>
  );
}
