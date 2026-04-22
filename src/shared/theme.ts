export type ThemeId = string;

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  surfacePrimary: string;
  surfaceHover: string;
  surfaceActive: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  borderPrimary: string;
  borderSecondary: string;
  accentPrimary: string;
  accentHover: string;
  accentActive: string;
  accentSubtle: string;
  statusError: string;
  statusWarning: string;
  statusSuccess: string;
  statusInfo: string;
  focusRing: string;
  scrollbarThumb: string;
  scrollbarTrack: string;
}

export interface ThemeSpacing {
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusFull: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  builtIn: boolean;
  colorScheme: "light" | "dark";
  colors: ThemeColors;
  spacing?: ThemeSpacing;
  version: number;
}

export type ExportedTheme = Omit<ThemeDefinition, "builtIn"> & { builtIn: false };

export const THEME_SCHEMA_VERSION = 1;

export const DEFAULT_SPACING: ThemeSpacing = {
  radiusSm: "0.375rem",
  radiusMd: "0.5rem",
  radiusLg: "0.75rem",
  radiusFull: "9999px",
};

export const COLOR_TOKEN_TO_CSS_VAR: Record<keyof ThemeColors, string> = {
  bgPrimary: "--theme-bg-primary",
  bgSecondary: "--theme-bg-secondary",
  bgTertiary: "--theme-bg-tertiary",
  surfacePrimary: "--theme-surface-primary",
  surfaceHover: "--theme-surface-hover",
  surfaceActive: "--theme-surface-active",
  textPrimary: "--theme-text-primary",
  textSecondary: "--theme-text-secondary",
  textTertiary: "--theme-text-tertiary",
  textInverse: "--theme-text-inverse",
  borderPrimary: "--theme-border-primary",
  borderSecondary: "--theme-border-secondary",
  accentPrimary: "--theme-accent-primary",
  accentHover: "--theme-accent-hover",
  accentActive: "--theme-accent-active",
  accentSubtle: "--theme-accent-subtle",
  statusError: "--theme-status-error",
  statusWarning: "--theme-status-warning",
  statusSuccess: "--theme-status-success",
  statusInfo: "--theme-status-info",
  focusRing: "--theme-focus-ring",
  scrollbarThumb: "--theme-scrollbar-thumb",
  scrollbarTrack: "--theme-scrollbar-track",
};

export const SPACING_TOKEN_TO_CSS_VAR: Record<keyof ThemeSpacing, string> = {
  radiusSm: "--theme-radius-sm",
  radiusMd: "--theme-radius-md",
  radiusLg: "--theme-radius-lg",
  radiusFull: "--theme-radius-full",
};

const COLOR_KEYS = Object.keys(COLOR_TOKEN_TO_CSS_VAR) as (keyof ThemeColors)[];
const SPACING_KEYS = Object.keys(SPACING_TOKEN_TO_CSS_VAR) as (keyof ThemeSpacing)[];

export const buildThemeCSSVars = (theme: ThemeDefinition): string => {
  const lines: string[] = [];
  for (const key of COLOR_KEYS) {
    lines.push(`${COLOR_TOKEN_TO_CSS_VAR[key]}: ${theme.colors[key]};`);
  }
  const spacing = theme.spacing ?? DEFAULT_SPACING;
  for (const key of SPACING_KEYS) {
    lines.push(`${SPACING_TOKEN_TO_CSS_VAR[key]}: ${spacing[key]};`);
  }
  return lines.join("\n");
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

export const validateTheme = (raw: unknown): raw is ThemeDefinition => {
  if (!isObject(raw)) return false;
  if (!isNonEmptyString(raw.id)) return false;
  if (!isNonEmptyString(raw.name)) return false;
  if (typeof raw.builtIn !== "boolean") return false;
  if (raw.colorScheme !== "light" && raw.colorScheme !== "dark") return false;
  if (typeof raw.version !== "number") return false;

  if (!isObject(raw.colors)) return false;
  for (const key of COLOR_KEYS) {
    if (!isNonEmptyString(raw.colors[key])) return false;
  }

  if (raw.spacing !== undefined) {
    if (!isObject(raw.spacing)) return false;
    for (const key of SPACING_KEYS) {
      if (!isNonEmptyString(raw.spacing[key])) return false;
    }
  }

  return true;
};
