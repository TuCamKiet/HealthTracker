import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { auth, db } from "../services/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/slices/healthSlice";

export default function ProfileScreen() {
  const dispatch = useDispatch();

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Lấy User ID của người dùng đang đăng nhập
  const userId = auth.currentUser?.uid;

  // Tải dữ liệu từ Firestore khi mở màn hình
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
        }
      } catch (error) {
        console.log("Lỗi khi tải dữ liệu:", error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchUserData();
  }, [userId]);

  // Lưu dữ liệu lên Firestore
  // Lưu dữ liệu lên Firestore
  const handleSaveProfile = async () => {
    if (!height || !weight) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ chiều cao và cân nặng!");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Cập nhật Redux trước
      dispatch(
        setUserData({ weight: parseFloat(weight), height: parseFloat(height) }),
      );

      // 2. Cập nhật lên Firebase
      const userRef = doc(db, "users", userId);
      await setDoc(
        userRef,
        {
          height: parseFloat(height),
          weight: parseFloat(weight),
          updatedAt: new Date(),
        },
        { merge: true },
      );

      // NGAY LẬP TỨC SAU DÒNG NÀY: onSnapshot ở App.js sẽ bắt được tín hiệu
      // và tự động hất bạn văng thẳng vào Dashboard mà không cần dòng code chuyển trang nào!
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Chiều cao (cm)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ví dụ: 170"
        value={height}
        onChangeText={setHeight}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Cân nặng (kg)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ví dụ: 65"
        value={weight}
        onChangeText={setWeight}
        keyboardType="numeric"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSaveProfile}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Lưu thông tin</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.logoutButton]}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F5F7FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#3B82F6",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 30,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
  logoutButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#EF4444",
    marginTop: 15,
  },
  logoutText: { color: "#EF4444", fontWeight: "bold", fontSize: 16 },
});
