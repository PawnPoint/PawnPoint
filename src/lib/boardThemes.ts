export const BOARD_THEMES: Record<string, { light: string; dark: string }> = {
  brown: { light: "#f4e3c7", dark: "#b87b46" },
  blue: { light: "#e2ecf7", dark: "#5b6f8c" },
  green: { light: "#e5f2e0", dark: "#6a8b6a" },
};

export const DEFAULT_BOARD_THEME = "brown";

export function resolveBoardTheme(theme?: string) {
  const key = theme && BOARD_THEMES[theme] ? theme : DEFAULT_BOARD_THEME;
  return { key, colors: BOARD_THEMES[key] };
}
