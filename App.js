import React, { useState, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Redux imports
import { Provider } from "react-redux";
import { store } from "./src/redux/store";

// Firebase imports
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./src/services/firebaseConfig";

// Import Screens
import DashboardScreen from "./src/screens/DashboardScreen";
import LoginScreen from "./src/screens/LoginScreen";

import { TouchableOpacity, Text } from "react-native"; // Thêm TouchableOpacity và Text
import ProfileScreen from "./src/screens/ProfileScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Lắng nghe trạng thái đăng nhập từ Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });

    // Dọn dẹp listener khi unmount
    return unsubscribe;
  }, [initializing]);

  // Hiển thị màn hình chờ trong lúc Firebase kiểm tra trạng thái
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator>
          {/* Luồng điều hướng có điều kiện */}
          {user ? (
            // Cập nhật lại Stack của Dashboard và thêm Profile
            <>
              <Stack.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={({ navigation }) => ({
                  title: "Health Overview",
                  headerStyle: { backgroundColor: "#FFFFFF" },
                  headerShadowVisible: false,
                  // Thêm nút Profile ở góc phải Header
                  headerRight: () => (
                    <TouchableOpacity
                      onPress={() => navigation.navigate("Profile")}
                    >
                      <Text
                        style={{
                          color: "#3B82F6",
                          fontWeight: "bold",
                          fontSize: 16,
                        }}
                      >
                        Profile
                      </Text>
                    </TouchableOpacity>
                  ),
                })}
              />
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: "Hồ sơ cá nhân" }}
              />
            </>
          ) : (
            // Nếu KHÔNG CÓ user -> hiển thị màn hình Login
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }} // Ẩn thanh tiêu đề ở màn hình đăng nhập
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}
