import type { CustomColors } from "../store/settings";

const CUSTOM_PROPS = [
  "--bg",
  "--text",
  "--text-2",
  "--text-3",
  "--surface",
  "--surface-2",
  "--surface-3",
  "--border",
  "--border-strong",
  "--accent",
  "--accent-rgb",
  "--accent-soft",
  "--app-rgb",
  "--chrome",
  "--chrome-2",
  "--chrome-3",
  "--rail-active-bg",
  "--rail-active-fg",
  "--play-bg",
  "--play-fg",
  "--card-bg",
];

export function cleanHex(value: string): string {
  const hex = value.replace("#", "").trim();
  if (hex.length === 3) return hex.split("").map((c) => c + c).join("");
  if (hex.length >= 6) return hex.slice(0, 6);
  return "999999";
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = cleanHex(hex);
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

export function mixHex(a: string, b: string, amount: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * amount);
  const g = Math.round(g1 + (g2 - g1) * amount);
  const bl = Math.round(b1 + (b2 - b1) * amount);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyCustomTheme(colors: CustomColors) {
  const root = document.documentElement.style;
  const bg = colors.background;
  const text = colors.foreground;
  const card = colors.card;
  const accent = colors.accent;

  root.setProperty("--bg", bg);
  root.setProperty("--text", text);
  root.setProperty("--text-2", mixHex(text, bg, 0.38));
  root.setProperty("--text-3", mixHex(text, bg, 0.62));
  root.setProperty("--surface", card);
  root.setProperty("--surface-2", mixHex(card, text, 0.06));
  root.setProperty("--surface-3", mixHex(card, text, 0.12));
  root.setProperty("--border", colors.border);
  root.setProperty("--border-strong", mixHex(colors.border, text, 0.18));
  root.setProperty("--accent", accent);
  root.setProperty("--accent-rgb", hexToRgb(accent).join(", "));
  root.setProperty("--accent-soft", rgba(accent, 0.14));
  root.setProperty("--app-rgb", hexToRgb(bg).join(", "));
  root.setProperty("--chrome", rgba(card, 0.86));
  root.setProperty("--chrome-2", mixHex(card, text, 0.04));
  root.setProperty("--chrome-3", mixHex(card, text, 0.08));
  root.setProperty("--rail-active-bg", text);
  root.setProperty("--rail-active-fg", bg);
  root.setProperty("--play-bg", text);
  root.setProperty("--play-fg", bg);
  root.setProperty("--card-bg", card);
}

export function clearCustomTheme() {
  const root = document.documentElement.style;
  CUSTOM_PROPS.forEach((prop) => root.removeProperty(prop));
}
