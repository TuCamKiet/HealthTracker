import React from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ compact = false }) {
  const { theme, isDark, toggleTheme, spacing } = useTheme();

  if (compact) {
    return (
      <Switch
        value={isDark}
        onValueChange={toggleTheme}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={theme.border}
      />
    );
  }

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          padding: spacing.lg,
          borderRadius: 14,
        },
      ]}
    >
      <View style={styles.left}>
        <Ionicons
          name={isDark ? "moon" : "sunny"}
          size={20}
          color={theme.primary}
        />
        <View style={{ marginLeft: spacing.md }}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            {isDark ? "Dark Mode" : "Light Mode"}
          </Text>
          <Text style={[styles.sub, { color: theme.textMuted }]}>
            Switch app appearance
          </Text>
        </View>
      </View>
      <Switch
        value={isDark}
        onValueChange={toggleTheme}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={theme.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
  sub: {
    fontSize: 12,
    marginTop: 2,
  },
});
