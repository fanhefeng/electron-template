import type { ThemeDefinition, ThemeId } from "../theme";
import { lightTheme } from "./light";
import { darkTheme } from "./dark";
import { blueDarkTheme } from "./blue-dark";
import { greenDarkTheme } from "./green-dark";
import { roseLightTheme } from "./rose-light";

export const BUILTIN_THEMES: readonly ThemeDefinition[] = [
  lightTheme,
  darkTheme,
  blueDarkTheme,
  greenDarkTheme,
  roseLightTheme,
];

export const DEFAULT_THEME_ID: ThemeId = "builtin-light";

export const getBuiltinTheme = (id: ThemeId): ThemeDefinition | undefined => BUILTIN_THEMES.find((t) => t.id === id);
