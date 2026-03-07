/**
 * Design System Tokens
 *
 * Professional SaaS design following Linear, Stripe, and Vercel patterns
 * Uses 8px spacing scale, consistent typography, and minimal aesthetics
 */

// ===== COLOR PALETTE =====
export const colors = {
  // Neutrals - Core brand neutrals
  white: "#ffffff",
  black: "#000000",

  // Dark mode grays (primary)
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
    950: "#030712",
  },

  // Backgrounds
  background: {
    primary: "#ffffff",         // Light mode
    secondary: "#f9fafb",       // Light mode alt
    dark: "#000000",            // Dark mode
    darkAlt: "#030712",         // Dark mode alt
    card: "#f9fafb",            // Card backgrounds light
    cardDark: "#111827",        // Card backgrounds dark
    border: "#e5e7eb",          // Light borders
    borderDark: "#1f2937",      // Dark borders
  },

  // Primary brand color
  primary: {
    50: "#eef2ff",
    100: "#e0e7ff",
    200: "#c7d2fe",
    300: "#a5b4fc",
    400: "#818cf8",
    500: "#6366f1",
    600: "#4f46e5",
    700: "#4338ca",
    800: "#3730a3",
    900: "#312e81",
  },

  // Secondary accent (for emphasis)
  accent: {
    50: "#fef3c7",
    100: "#fde68a",
    200: "#fcd34d",
    300: "#fbbf24",
    400: "#f59e0b",
    500: "#f97316",
    600: "#ea580c",
    700: "#c2410c",
    800: "#92400e",
    900: "#78350f",
  },

  // Status colors
  status: {
    success: "#059669",
    error: "#dc2626",
    warning: "#f59e0b",
    info: "#3b82f6",
  },

  // Text colors
  text: {
    primary: "#000000",         // Light mode text
    secondary: "#6b7280",       // Light mode secondary
    tertiary: "#9ca3af",        // Light mode tertiary

    primaryDark: "#ffffff",     // Dark mode text
    secondaryDark: "#d1d5db",   // Dark mode secondary
    tertiaryDark: "#9ca3af",    // Dark mode tertiary
    disabled: "#d1d5db",
  },
};

// ===== SPACING SCALE (8px base unit) =====
export const spacing = {
  0: "0",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "28px",
  8: "32px",
  9: "36px",
  10: "40px",
  12: "48px",
  14: "56px",
  16: "64px",
  20: "80px",
  24: "96px",
  28: "112px",
  32: "128px",
} as const;

// ===== TYPOGRAPHY =====
export const typography = {
  fontFamily: {
    sans: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(", "),
    mono: [
      '"SF Mono"',
      '"Roboto Mono"',
      '"Courier New"',
      "monospace",
    ].join(", "),
  },

  // Size and weight combinations
  size: {
    // Display / Hero
    display: {
      large: { size: "48px", weight: 700, lineHeight: 1.2, letterSpacing: "-0.02em" },
      medium: { size: "36px", weight: 700, lineHeight: 1.3, letterSpacing: "-0.02em" },
    },

    // Headings
    heading: {
      h1: { size: "32px", weight: 700, lineHeight: 1.4, letterSpacing: "-0.01em" },
      h2: { size: "24px", weight: 700, lineHeight: 1.4, letterSpacing: "-0.01em" },
      h3: { size: "20px", weight: 600, lineHeight: 1.5, letterSpacing: "0em" },
      h4: { size: "18px", weight: 600, lineHeight: 1.5, letterSpacing: "0em" },
    },

    // Body text
    body: {
      lg: { size: "18px", weight: 400, lineHeight: 1.6, letterSpacing: "0em" },
      base: { size: "16px", weight: 400, lineHeight: 1.6, letterSpacing: "0em" },
      sm: { size: "14px", weight: 400, lineHeight: 1.6, letterSpacing: "0em" },
      xs: { size: "12px", weight: 400, lineHeight: 1.5, letterSpacing: "0em" },
    },

    // UI elements
    button: { size: "14px", weight: 600, lineHeight: 1.4, letterSpacing: "0em" },
    label: { size: "12px", weight: 600, lineHeight: 1.4, letterSpacing: "0.05em" },
    caption: { size: "11px", weight: 500, lineHeight: 1.4, letterSpacing: "0.05em" },
  },
};

// ===== BORDER RADIUS =====
export const borderRadius = {
  none: "0",
  sm: "4px",
  base: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;

// ===== SHADOWS =====
export const shadows = {
  none: "none",
  // Subtle shadows for depth
  xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  sm: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
  base: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  md: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  lg: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",

  // For dark mode
  darkXs: "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
  darkSm: "0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.3)",
  darkBase: "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)",
  darkMd: "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)",
  darkLg: "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
};

// ===== TRANSITIONS =====
export const transitions = {
  none: "none",
  subtle: "all 0.15s ease",
  base: "all 0.2s ease",
  smooth: "all 0.3s ease",
  slow: "all 0.4s ease",
};

// ===== Z-INDEX SCALE =====
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};

// ===== BREAKPOINTS =====
export const breakpoints = {
  xs: "480px",
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;
