import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  lightTheme,
  darkTheme,
  spacing,
  radii,
  shadow,
  softShadow,
} from "../utils/theme";

const STORAGE_KEY = "@healthtracker_theme_mode"; // "light" | "dark"

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = Appearance.getColorScheme();
  const [isDark, setIsDark] = useState(systemScheme !== "light");
  const [isReady, setIsReady] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === "light") setIsDark(false);
        if (saved === "dark") setIsDark(true);
      } catch (e) {
        // ignore — fall back to system preference
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch (e) {
      // ignore persistence errors
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({
      theme,
      isDark,
      toggleTheme,
      spacing,
      radii,
      shadow: (color, opacity) => shadow(theme, color, opacity),
      softShadow: () => softShadow(theme),
    }),
    [theme, isDark],
  );

  if (!isReady) return null; // brief blank frame while reading storage

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
