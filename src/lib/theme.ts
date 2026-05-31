export const themeStorageKey = "self-trace-dev-theme";

export const themeTokens = [
  { key: "bg", label: "页面背景", value: "#ffffff" },
  { key: "bgGlow", label: "顶部氛围", value: "#ffffff" },
  { key: "panel", label: "卡片背景", value: "#fdfff2" },
  { key: "surface", label: "按钮/事件", value: "#f0ffde" },
  { key: "surfaceAlt", label: "输入/评分底", value: "#f2f7b7" },
  { key: "surfaceSoft", label: "次级按钮", value: "#f7fadb" },
  { key: "surfaceBlue", label: "灰蓝按钮", value: "#d7e8cf" },
  { key: "accent", label: "主强调", value: "#81ff7f" },
  { key: "accentStrong", label: "选中按钮", value: "#c0daff" },
  { key: "accentText", label: "强调文字", value: "#d89029" },
  { key: "activeText", label: "导航激活", value: "#cf8c94" },
  { key: "blue", label: "灰蓝辅助", value: "#c0daff" },
  { key: "blueText", label: "灰蓝文字", value: "#9eb0bd" },
  { key: "success", label: "完成态", value: "#14d94d" },
  { key: "successText", label: "完成文字", value: "#22c958" },
  { key: "text", label: "主文字", value: "#22c958" },
  { key: "muted", label: "次级文字", value: "#20d752" },
  { key: "border", label: "边框", value: "#c8ffc7" },
  { key: "danger", label: "危险按钮", value: "#cf8c94" },
] as const;

export type ThemeKey = (typeof themeTokens)[number]["key"];
export type ThemeValues = Record<ThemeKey, string>;

export const defaultTheme = Object.fromEntries(themeTokens.map((token) => [token.key, token.value])) as ThemeValues;

export const greenTheme: ThemeValues = {
  ...defaultTheme,
};

export type ThemeMode = "default" | "dev" | "green";

export function readSavedTheme(): Partial<ThemeValues> {
  try {
    return JSON.parse(localStorage.getItem(themeStorageKey) || "{}") as Partial<ThemeValues>;
  } catch {
    return {};
  }
}

export function applyTheme(values: Partial<ThemeValues>): void {
  const root = document.documentElement;
  for (const token of themeTokens) {
    const value = values[token.key] || defaultTheme[token.key];
    root.style.setProperty(`--theme-${kebab(token.key)}`, value);
  }
}

export function getThemeMode(): ThemeMode {
  const theme = new URLSearchParams(window.location.search).get("theme");
  if (theme === "dev" || theme === "green") return theme;
  return "default";
}

export function applyThemeForCurrentUrl(): void {
  const mode = getThemeMode();
  if (mode === "dev") {
    applyTheme(readSavedTheme());
    return;
  }
  if (mode === "green") {
    applyTheme(greenTheme);
    return;
  }
  applyTheme(defaultTheme);
}

export function themeToCss(values: Partial<ThemeValues>): string {
  const merged = { ...defaultTheme, ...values };
  const lines = themeTokens.map((token) => `  --theme-${kebab(token.key)}: ${merged[token.key]};`);
  return [":root {", ...lines, "}"].join("\n");
}

export function saveTheme(values: Partial<ThemeValues>): void {
  localStorage.setItem(themeStorageKey, JSON.stringify(values));
  applyTheme(values);
}

export function resetTheme(): void {
  localStorage.removeItem(themeStorageKey);
  applyTheme(defaultTheme);
}

function kebab(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}
