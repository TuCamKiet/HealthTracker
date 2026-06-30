// Professional Fitness App Theme — supports Light & Dark mode
// Brand identity: energetic teal (primary) + warm orange (motivation accent)

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

// Shared brand colors that don't change between modes
const brand = {
  primary: "#0FB988", // teal — energy / progress
  primaryDark: "#0A9670",
  secondary: "#FF7A45", // warm orange — motivation / effort
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
};

export const lightTheme = {
  mode: "light",
  ...brand,

  bg: "#F5F7FA",
  bg2: "#FFFFFF",
  bg3: "#EEF1F6",
  card: "#FFFFFF",

  textPrimary: "#11161F",
  textSecondary: "#5B6472",
  textMuted: "#8B93A1",

  border: "#E3E7EE",
  divider: "#E3E7EE",

  inputBg: "#F0F2F6",

  // gradient pairs used for headline cards / buttons
  gradientPrimary: ["#0FB988", "#0A9670"],
  gradientSecondary: ["#FF7A45", "#FF5E3A"],
  gradientCard: ["#FFFFFF", "#F5F7FA"],

  statBlue: "#3B82F6",
  statOrange: "#FF7A45",
  statGreen: "#22C55E",
  statPurple: "#8B5CF6",
};

export const darkTheme = {
  mode: "dark",
  ...brand,

  bg: "#0D1117",
  bg2: "#161B22",
  bg3: "#1F2530",
  card: "#161B22",

  textPrimary: "#F4F6F8",
  textSecondary: "#9AA4B2",
  textMuted: "#6B7280",

  border: "#262C36",
  divider: "#262C36",

  inputBg: "#1B212B",

  gradientPrimary: ["#13D49B", "#0A9670"],
  gradientSecondary: ["#FF8A5C", "#FF5E3A"],
  gradientCard: ["#161B22", "#0D1117"],

  statBlue: "#5B9CFF",
  statOrange: "#FF8A5C",
  statGreen: "#34D772",
  statPurple: "#A78BFA",
};

export const shadow = (theme, color = theme.primary, opacity = 0.25) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: theme.mode === "dark" ? opacity : opacity * 0.6,
  shadowRadius: 12,
  elevation: 6,
});

export const softShadow = (theme) => ({
  shadowColor: theme.mode === "dark" ? "#000000" : "#1B2230",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: theme.mode === "dark" ? 0.4 : 0.08,
  shadowRadius: 8,
  elevation: 3,
});
