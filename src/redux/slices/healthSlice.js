import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  dailySteps: 0,
  caloriesBurned: 0,
  // You can add more global states here later (e.g., goalSteps, distance)
};

export const healthSlice = createSlice({
  name: "health",
  initialState,
  reducers: {
    updateSteps: (state, action) => {
      state.dailySteps = action.payload;
      // Simple initial formula: 1 step ≈ 0.04 calories
      state.caloriesBurned = parseFloat((action.payload * 0.04).toFixed(2));
    },
    resetDailyStats: (state) => {
      state.dailySteps = 0;
      state.caloriesBurned = 0;
    },
  },
});

export const { updateSteps, resetDailyStats } = healthSlice.actions;

export default healthSlice.reducer;
