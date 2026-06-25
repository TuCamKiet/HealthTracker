import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  dailySteps: 0,
  caloriesBurned: 0,
  weight: 65, // Mặc định 65kg
  height: 170, // Mặc định 170cm
};

// Hàm tiện ích tính calo gộp (không cần tính quãng đường)
const calculateCalories = (steps, height, weight) => {
  // Công thức: Steps * Height(cm) * Weight(kg) * Hằng số động học gộp
  const rawCalories = steps * height * weight * 0.000004289;
  return parseFloat(rawCalories.toFixed(2));
};

export const healthSlice = createSlice({
  name: "health",
  initialState,
  reducers: {
    setUserData: (state, action) => {
      if (action.payload.weight) state.weight = action.payload.weight;
      if (action.payload.height) state.height = action.payload.height;

      // Tính lại calo ngay khi hồ sơ thay đổi
      state.caloriesBurned = calculateCalories(
        state.dailySteps,
        state.height,
        state.weight,
      );
    },
    updateSteps: (state, action) => {
      state.dailySteps = action.payload;

      // Tính calo chuẩn khoa học mỗi khi có bước chân mới
      state.caloriesBurned = calculateCalories(
        action.payload,
        state.height,
        state.weight,
      );
    },
    resetDailyStats: (state) => {
      state.dailySteps = 0;
      state.caloriesBurned = 0;
    },
  },
});

export const { updateSteps, resetDailyStats, setUserData } =
  healthSlice.actions;

export default healthSlice.reducer;
