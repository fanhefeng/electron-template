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

const COLOR_TOKEN_TO_CSS_VAR: Record<keyof ThemeColors, string> = {
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

const SPACING_TOKEN_TO_CSS_VAR: Record<keyof ThemeSpacing, string> = {
  radiusSm: "--theme-radius-sm",
  radiusMd: "--theme-radius-md",
  radiusLg: "--theme-radius-lg",
  radiusFull: "--theme-radius-full",
};

const COLOR_KEYS = Object.keys(COLOR_TOKEN_TO_CSS_VAR) as (keyof ThemeColors)[];
const SPACING_KEYS = Object.keys(SPACING_TOKEN_TO_CSS_VAR) as (keyof ThemeSpacing)[];

const MAX_THEME_NAME_LENGTH = 100;
const MAX_COLOR_VALUE_LENGTH = 64;
const MAX_SPACING_VALUE_LENGTH = 32;

// Strict whitelist for CSS color values: hex, rgb()/hsl() function forms, or bare
// keywords (named colors / transparent / currentColor). The function-argument charset
// excludes ; : { } ( ) " ' so a value can never break out of the generated
// `--var: value;` declaration inside the injected :root block (stored CSS injection).
const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
// The lookahead requires at least one digit in the arguments: empty-arg forms
// like `rgb()` are syntactically matched but invalid CSS, and a SET-but-invalid
// custom property disables the var() fallback (see CSS_NAMED_COLORS below).
const FUNC_COLOR_PATTERN = /^(?:rgb|rgba|hsl|hsla)\((?=[^)]*\d)[0-9a-z.,%\s/+-]*\)$/i;

// Bare keywords are checked against the REAL CSS named-color list: a loose
// /^[a-z]+$/ would accept any word ("banana"), and a custom property that is
// SET to an invalid value is worse than an unset one — `var(--x, fallback)`
// does NOT apply its fallback for set-but-invalid values, so that token would
// render broken with no graceful degradation.
const CSS_NAMED_COLORS = new Set([
  "transparent",
  "currentcolor",
  "aliceblue",
  "antiquewhite",
  "aqua",
  "aquamarine",
  "azure",
  "beige",
  "bisque",
  "black",
  "blanchedalmond",
  "blue",
  "blueviolet",
  "brown",
  "burlywood",
  "cadetblue",
  "chartreuse",
  "chocolate",
  "coral",
  "cornflowerblue",
  "cornsilk",
  "crimson",
  "cyan",
  "darkblue",
  "darkcyan",
  "darkgoldenrod",
  "darkgray",
  "darkgreen",
  "darkgrey",
  "darkkhaki",
  "darkmagenta",
  "darkolivegreen",
  "darkorange",
  "darkorchid",
  "darkred",
  "darksalmon",
  "darkseagreen",
  "darkslateblue",
  "darkslategray",
  "darkslategrey",
  "darkturquoise",
  "darkviolet",
  "deeppink",
  "deepskyblue",
  "dimgray",
  "dimgrey",
  "dodgerblue",
  "firebrick",
  "floralwhite",
  "forestgreen",
  "fuchsia",
  "gainsboro",
  "ghostwhite",
  "gold",
  "goldenrod",
  "gray",
  "green",
  "greenyellow",
  "grey",
  "honeydew",
  "hotpink",
  "indianred",
  "indigo",
  "ivory",
  "khaki",
  "lavender",
  "lavenderblush",
  "lawngreen",
  "lemonchiffon",
  "lightblue",
  "lightcoral",
  "lightcyan",
  "lightgoldenrodyellow",
  "lightgray",
  "lightgreen",
  "lightgrey",
  "lightpink",
  "lightsalmon",
  "lightseagreen",
  "lightskyblue",
  "lightslategray",
  "lightslategrey",
  "lightsteelblue",
  "lightyellow",
  "lime",
  "limegreen",
  "linen",
  "magenta",
  "maroon",
  "mediumaquamarine",
  "mediumblue",
  "mediumorchid",
  "mediumpurple",
  "mediumseagreen",
  "mediumslateblue",
  "mediumspringgreen",
  "mediumturquoise",
  "mediumvioletred",
  "midnightblue",
  "mintcream",
  "mistyrose",
  "moccasin",
  "navajowhite",
  "navy",
  "oldlace",
  "olive",
  "olivedrab",
  "orange",
  "orangered",
  "orchid",
  "palegoldenrod",
  "palegreen",
  "paleturquoise",
  "palevioletred",
  "papayawhip",
  "peachpuff",
  "peru",
  "pink",
  "plum",
  "powderblue",
  "purple",
  "rebeccapurple",
  "red",
  "rosybrown",
  "royalblue",
  "saddlebrown",
  "salmon",
  "sandybrown",
  "seagreen",
  "seashell",
  "sienna",
  "silver",
  "skyblue",
  "slateblue",
  "slategray",
  "slategrey",
  "snow",
  "springgreen",
  "steelblue",
  "tan",
  "teal",
  "thistle",
  "tomato",
  "turquoise",
  "violet",
  "wheat",
  "white",
  "whitesmoke",
  "yellow",
  "yellowgreen",
]);

export const isSafeCssColor = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_COLOR_VALUE_LENGTH) return false;
  return (
    HEX_COLOR_PATTERN.test(trimmed) || FUNC_COLOR_PATTERN.test(trimmed) || CSS_NAMED_COLORS.has(trimmed.toLowerCase())
  );
};

// CSS length for radius tokens: a NON-NEGATIVE number with an optional standard
// unit — border-radius rejects negative values (set-but-invalid would also
// disable the var() fallback), so they must not validate.
const SPACING_PATTERN = /^(?:\d+|\d*\.\d+)(?:px|rem|em|%|vh|vw)?$/;

export const isSafeCssLength = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_SPACING_VALUE_LENGTH) return false;
  return SPACING_PATTERN.test(trimmed);
};

export const buildThemeCSSVars = (theme: ThemeDefinition): string => {
  const lines: string[] = [];
  for (const key of COLOR_KEYS) {
    // Defense in depth: themes persisted before value validation existed (or a
    // hand-edited themes.json) must still never reach the style tag unescaped.
    const value = isSafeCssColor(theme.colors[key]) ? theme.colors[key].trim() : "initial";
    lines.push(`${COLOR_TOKEN_TO_CSS_VAR[key]}: ${value};`);
  }
  const spacing = theme.spacing ?? DEFAULT_SPACING;
  for (const key of SPACING_KEYS) {
    const value = isSafeCssLength(spacing[key]) ? spacing[key].trim() : DEFAULT_SPACING[key];
    lines.push(`${SPACING_TOKEN_TO_CSS_VAR[key]}: ${value};`);
  }
  return lines.join("\n");
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

const isValidName = (value: unknown): value is string =>
  isNonEmptyString(value) && value.trim().length > 0 && value.length <= MAX_THEME_NAME_LENGTH;

const validateColorsAndSpacing = (raw: Record<string, unknown>): boolean => {
  if (!isObject(raw.colors)) return false;
  for (const key of COLOR_KEYS) {
    if (!isSafeCssColor(raw.colors[key])) return false;
  }
  if (raw.spacing !== undefined) {
    if (!isObject(raw.spacing)) return false;
    for (const key of SPACING_KEYS) {
      if (!isSafeCssLength(raw.spacing[key])) return false;
    }
  }
  return true;
};

export const validateTheme = (raw: unknown): raw is ThemeDefinition => {
  if (!isObject(raw)) return false;
  if (!isNonEmptyString(raw.id)) return false;
  if (!isValidName(raw.name)) return false;
  if (typeof raw.builtIn !== "boolean") return false;
  if (raw.colorScheme !== "light" && raw.colorScheme !== "dark") return false;
  if (typeof raw.version !== "number") return false;
  return validateColorsAndSpacing(raw);
};

/** Validates renderer-supplied data for theme creation (no id/builtIn yet). */
export const validateThemeData = (raw: unknown): raw is Omit<ThemeDefinition, "id" | "builtIn"> => {
  if (!isObject(raw)) return false;
  if (!isValidName(raw.name)) return false;
  if (raw.colorScheme !== "light" && raw.colorScheme !== "dark") return false;
  if (typeof raw.version !== "number") return false;
  return validateColorsAndSpacing(raw);
};

/**
 * Rebuilds theme data keeping ONLY known keys (drops arbitrary extra JSON keys so
 * they are never persisted to themes.json) and trims/caps the string values.
 */
export const pickThemeData = (
  data: Omit<ThemeDefinition, "id" | "builtIn">
): Omit<ThemeDefinition, "id" | "builtIn"> => {
  const colors = {} as ThemeColors;
  for (const key of COLOR_KEYS) {
    colors[key] = data.colors[key].trim();
  }
  let spacing: ThemeSpacing | undefined;
  if (data.spacing) {
    spacing = {} as ThemeSpacing;
    for (const key of SPACING_KEYS) {
      spacing[key] = data.spacing[key].trim();
    }
  }
  return {
    name: data.name.trim().slice(0, MAX_THEME_NAME_LENGTH),
    colorScheme: data.colorScheme,
    colors,
    ...(spacing ? { spacing } : {}),
    version: data.version,
  };
};

/** Keeps only known, present keys from an update patch (unknown keys are dropped). */
export const pickThemePatch = (patch: Partial<ThemeDefinition>): Partial<ThemeDefinition> => {
  const out: Partial<ThemeDefinition> = {};
  if (patch.name !== undefined && typeof patch.name === "string") {
    out.name = patch.name.trim().slice(0, MAX_THEME_NAME_LENGTH);
  }
  if (patch.colorScheme !== undefined) out.colorScheme = patch.colorScheme;
  if (patch.version !== undefined) out.version = patch.version;
  if (patch.colors !== undefined && isObject(patch.colors)) {
    // Copy only keys PRESENT in the patch: writing `undefined` for absent keys
    // would clobber existing values when the caller merges, making partial
    // color patches impossible (validateTheme would always reject them).
    const colors = {} as ThemeColors;
    for (const key of COLOR_KEYS) {
      const value = patch.colors[key];
      // Skip non-string values outright: ThemeColors is string-typed, and a
      // non-string would only be rejected later by validateTheme — never write
      // a value that is guaranteed to fail downstream validation.
      if (typeof value === "string") {
        colors[key] = value.trim();
      }
    }
    out.colors = colors;
  }
  if (patch.spacing !== undefined && isObject(patch.spacing)) {
    const spacing = {} as ThemeSpacing;
    for (const key of SPACING_KEYS) {
      const value = patch.spacing[key];
      // Same as colors: only string lengths are valid; drop anything else.
      if (typeof value === "string") {
        spacing[key] = value.trim();
      }
    }
    out.spacing = spacing;
  }
  return out;
};
