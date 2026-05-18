export const themeColors = {
  primary: "#155EEF",
  sidebar: "#0F172A",
  success: "#16A34A",
  warning: "#F97316",
  danger: "#DC2626",
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
} as const;

export type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "primary"
  | "neutral";

export const statusToneColors: Record<StatusTone, string> = {
  success: themeColors.success,
  warning: themeColors.warning,
  danger: themeColors.danger,
  primary: themeColors.primary,
  neutral: themeColors.textSecondary,
};
