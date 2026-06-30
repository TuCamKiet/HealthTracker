import React, { useState, useEffect } from "react";
import { ActivityIndicator, View, TouchableOpacity, Text } from "react-native";
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
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./src/services/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

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
        const userRef = doc(db, "users", currentUser.uid);

        unsubProfile = onSnapshot(
          userRef,
          (userSnap) => {
            if (
              userSnap.exists() &&
              userSnap.data().height &&
              userSnap.data().weight
            ) {
              const data = userSnap.data();
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
      {/* The brain runs globally here */}
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
