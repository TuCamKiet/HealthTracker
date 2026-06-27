import { createSlice } from "@reduxjs/toolkit";
import { calculateWalkingStats } from "../../utils/HealthCalculator";

const initialState = {
  // User Profile
  weight: 65,
  height: 170,
  age: 22,
  sex: "male",

  // Activity
  dailySteps: 0,
  walkingSeconds: 0,

  // Calculated
  strideLength: 0,
  distanceMeters: 0,
  speed: 0,
  met: 0,
  caloriesBurned: 0,
};

export const healthSlice = createSlice({
  name: "health",
  initialState,
  reducers: {
    setUserData(state, action) {
      const { weight, height, age, sex } = action.payload;
      if (weight != null) state.weight = weight;
      if (height != null) state.height = height;
      if (age != null) state.age = age;
      if (sex != null) state.sex = sex;

      // Calculate baseline stride length immediately
      const heightM = state.height / 100;
      const ratio = state.sex === "female" ? 0.413 : 0.415;
      state.strideLength = heightM * ratio;
    },

    // --------------------------------------------------
    // NEW: Accumulate Live Physics (Maximum Accuracy)
    // --------------------------------------------------
    addLiveActivity(state, action) {
      const { deltaSteps, deltaDistance, deltaWalkingSeconds, deltaCalories } =
        action.payload;

      // Accumulate totals
      state.dailySteps += deltaSteps;
      state.distanceMeters += deltaDistance;
      state.walkingSeconds += deltaWalkingSeconds;

      // Accumulate precise live calories
      state.caloriesBurned = Number(
        (state.caloriesBurned + deltaCalories).toFixed(2),
      );

      // Update average stats for the day
      if (state.walkingSeconds > 0) {
        state.speed = state.distanceMeters / state.walkingSeconds;
      }
    },

    // --------------------------------------------------
    // Legacy update for full-day sync (Fallback)
    // --------------------------------------------------
    updateActivity(state, action) {
      const { steps, walkingSeconds, overrideCalories } = action.payload;
      state.dailySteps = steps;
      state.walkingSeconds = walkingSeconds;

      const stats = calculateWalkingStats({
        steps,
        height: state.height,
        weight: state.weight,
        sex: state.sex,
        walkingSeconds,
      });

      state.strideLength = stats.strideLength;
      state.distanceMeters = stats.distanceMeters;
      state.speed = stats.speed;
      state.met = stats.met;

      // Only recalculate calories if we aren't accumulating live ones
      if (overrideCalories !== undefined) {
        state.caloriesBurned = overrideCalories;
      } else if (state.caloriesBurned === 0) {
        state.caloriesBurned = stats.calories;
      }
    },

    resetDailyStats(state) {
      state.dailySteps = 0;
      state.walkingSeconds = 0;
      state.distanceMeters = 0;
      state.strideLength = 0;
      state.speed = 0;
      state.met = 0;
      state.caloriesBurned = 0;
    },
  },
});

export const { setUserData, addLiveActivity, updateActivity, resetDailyStats } =
  healthSlice.actions;
export default healthSlice.reducer;
