import { configureStore } from "@reduxjs/toolkit";
import healthReducer from "./slices/healthSlice";

export const store = configureStore({
  reducer: {
    health: healthReducer,
  },
});
