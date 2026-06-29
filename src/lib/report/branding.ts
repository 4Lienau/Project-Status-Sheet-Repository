// Single source of brand styling for all three report renderers.
import type { StatusColor } from "@/types/report";

export const BRAND = {
  logoUrl: "/images/rewa-logo-color.png",
  name: "ReWa",
  reportTitle: "Project Report",
  colors: {
    primary: "#1D4ED8",
    primaryLight: "#3B82F6",
    // Darker blue used for the report header band so the ReWa logo (now placed
    // outside the band, on white) and status chips don't wash out against it.
    headerBand: "#172554",
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

// Maps a milestone.status value to a status color for chips.
// The edit component stores status as the literal color words
// "green" | "yellow" | "red" (labeled On Track / At Risk / Behind). Older
// semantic strings are also accepted for backward compatibility.
export function milestoneStatusColor(status: string): StatusColor {
  switch ((status || "").toLowerCase()) {
    case "green":
    case "completed":
    case "complete":
    case "on-schedule":
    case "on-track":
      return "green";
    case "red":
    case "high-risk":
    case "off-track":
    case "behind":
      return "red";
    case "yellow":
    case "at-risk":
      return "yellow";
    default:
      return "yellow";
  }
}

// Human-friendly health label for a milestone, matching the edit component's
// status dropdown (green = On Track, yellow = At Risk, red = Behind).
export const MILESTONE_STATUS_TEXT: Record<StatusColor, string> = {
  green: "On Track",
  yellow: "At Risk",
  red: "Behind",
};

// A milestone is considered complete once its completion reaches 100%.
export function isMilestoneComplete(completion: number | null | undefined): boolean {
  return (completion ?? 0) >= 100;
}
