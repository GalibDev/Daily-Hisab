export const ICON_STYLE_STORAGE_KEY = "daily-hisab.icon-style.v1";
export const ICON_STYLE_EVENT = "daily-hisab:icon-style-change";
export const UI_THEME_STORAGE_KEY = "daily-hisab.ui-theme.v1";
export const UI_THEME_EVENT = "daily-hisab:ui-theme-change";

export type IconStyle = "minimal" | "duotone" | "brand";
export type UiTheme = "default" | "aurora";

export function getStoredIconStyle(): IconStyle {
  if (typeof window === "undefined") return "duotone";
  const saved = window.localStorage.getItem(ICON_STYLE_STORAGE_KEY);
  return saved === "minimal" || saved === "brand" ? saved : "duotone";
}

export function getStoredUiTheme(): UiTheme {
  if (typeof window === "undefined") return "default";
  return window.localStorage.getItem(UI_THEME_STORAGE_KEY) === "aurora" ? "aurora" : "default";
}
