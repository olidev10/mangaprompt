import { Platform } from "react-native";

const tintColorLight = "#1D4ED8";
const tintColorDark = "#60A5FA";

export const Colors = {
  light: {
    text: "#0F172A",
    background: "#F8FAFC",
    surface: "#FFFFFF",
    card: "#F1F5F9",
    muted: "#64748B",
    border: "#CBD5E1",
    tint: tintColorLight,
    icon: "#64748B",
    tabIconDefault: "#94A3B8",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#E2E8F0",
    background: "#020617",
    surface: "#0F172A",
    card: "#1E293B",
    muted: "#94A3B8",
    border: "#334155",
    tint: tintColorDark,
    icon: "#94A3B8",
    tabIconDefault: "#64748B",
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
