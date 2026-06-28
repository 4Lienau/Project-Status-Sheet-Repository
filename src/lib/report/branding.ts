// Single source of brand styling for all three report renderers.
import type { StatusColor } from "@/types/report";

export const BRAND = {
  logoUrl: "/images/rewa-logo-color.png",
  name: "ReWa",
  reportTitle: "Project Report",
  colors: {
    primary: "#1D4ED8",
    primaryLight: "#3B82F6",
    text: "#1F2937",
    muted: "#6B7280",
    border: "#E5E7EB",
    headerBandText: "#FFFFFF",
    tableHeaderBg: "#1D4ED8",
    tableStripe: "#F3F4F6",
    statusGreen: "#16A34A",
    statusYellow: "#CA8A04",
    statusRed: "#DC2626",
    statusGreenBg: "#DCFCE7",
    statusYellowBg: "#FEF9C3",
    statusRedBg: "#FEE2E2",
  },
} as const;

export const STATUS_COLOR_HEX: Record<StatusColor, string> = {
  green: BRAND.colors.statusGreen,
  yellow: BRAND.colors.statusYellow,
  red: BRAND.colors.statusRed,
};

export const STATUS_COLOR_BG: Record<StatusColor, string> = {
  green: BRAND.colors.statusGreenBg,
  yellow: BRAND.colors.statusYellowBg,
  red: BRAND.colors.statusRedBg,
};

export const STATUS_COLOR_LABEL: Record<StatusColor, string> = {
  green: "Healthy",
  yellow: "At Risk",
  red: "Critical",
};

// Maps a milestone.status string to a status color for chips.
export function milestoneStatusColor(status: string): StatusColor {
  switch ((status || "").toLowerCase()) {
    case "completed":
    case "on-schedule":
      return "green";
    case "at-risk":
      return "yellow";
    case "high-risk":
      return "red";
    default:
      return "yellow";
  }
}
