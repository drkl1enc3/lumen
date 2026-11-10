import type { Accent } from "./types";
import { useSettings } from "../store/settings";

const ACCENT_HEX: Record<Accent, string> = {
  lavender: "#b3a1ff",
  emerald: "#5eead4",
  rose: "#fb8fa7",
  amber: "#f6c453",
  ice: "#7dd3fc",
};

export function useCoverAccent(): string | null {
  const enabled = useSettings((state) => state.coverThemeSync);
  const themePreset = useSettings((state) => state.themePreset);
  const accent = useSettings((state) => state.accent);
  const customAccent = useSettings((state) => state.customColors.accent);

  if (!enabled) return null;
  return themePreset === "custom" ? customAccent : ACCENT_HEX[accent];
}
