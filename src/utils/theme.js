// Futuristic Neon Gradient Theme for HealthTracker
export const colors = {
  // Primary Neon Colors
  neonCyan: "#00D9FF",
  neonMagenta: "#FF006E",
  neonPurple: "#8B5CF6",
  neonGreen: "#00FF88",
  neonPink: "#FF00FF",
  neonYellow: "#FFFF00",
  neonBlue: "#0099FF",

  // Dark Background
  darkBg: "#0A0E27",
  darkBg2: "#1A1F3A",
  darkBg3: "#252D47",

  // Text Colors
  textPrimary: "#FFFFFF",
  textSecondary: "#B0B8D4",
  textMuted: "#7A8299",

  // Accent Colors
  accentCyan: "#00D9FF",
  accentMagenta: "#FF006E",
  accentPurple: "#8B5CF6",

  // Status Colors
  success: "#00FF88",
  warning: "#FFAA00",
  error: "#FF0055",
  info: "#0099FF",
};

export const gradients = {
  // Primary gradients
  cyanMagenta: ["#00D9FF", "#FF006E"],
  purpleBlue: ["#8B5CF6", "#0099FF"],
  greenCyan: ["#00FF88", "#00D9FF"],
  magentaRed: ["#FF006E", "#FF0055"],

  // Dark overlays
  darkOverlay: ["rgba(10, 14, 39, 0.8)", "rgba(10, 14, 39, 0.95)"],
  darkOverlay2: ["rgba(26, 31, 58, 0.7)", "rgba(10, 14, 39, 0.9)"],
};

export const shadows = {
  neonCyan: {
    shadowColor: "#00D9FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 20,
  },
  neonMagenta: {
    shadowColor: "#FF006E",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 20,
  },
  neonPurple: {
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 20,
  },
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};
