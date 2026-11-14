const MODIFIER_ORDER = ["Ctrl", "Alt", "Shift", "Meta"] as const;

const KEY_ALIASES: Record<string, string> = {
  "→": "ArrowRight",
  "←": "ArrowLeft",
  "↑": "ArrowUp",
  "↓": "ArrowDown",
  arrowright: "ArrowRight",
  arrowleft: "ArrowLeft",
  arrowup: "ArrowUp",
  arrowdown: "ArrowDown",
  space: "Space",
  spacebar: "Space",
  " ": "Space",
  esc: "Escape",
  escape: "Escape",
  return: "Enter",
  enter: "Enter",
  del: "Delete",
  delete: "Delete",
  backspace: "Backspace",
  tab: "Tab",
  control: "Ctrl",
  ctrl: "Ctrl",
  cmd: "Meta",
  command: "Meta",
  super: "Meta",
  meta: "Meta",
  option: "Alt",
  alt: "Alt",
  shift: "Shift",
};

const PRETTY_KEYS: Record<string, string> = {
  ArrowRight: "→",
  ArrowLeft: "←",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Space: "Space",
};

function canonicalKey(key: string): string {
  const alias = KEY_ALIASES[key.toLowerCase()];
  if (alias) return alias;
  if (key.length === 1) return key.toUpperCase();
  return key;
}

/** Convert any user-facing hotkey string into a stable internal form. */
export function normalizeHotkey(input: string): string {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const modifiers = new Set<string>();
  let key = "";
  for (const token of tokens) {
    const canonical = canonicalKey(token);
    if (MODIFIER_ORDER.includes(canonical as (typeof MODIFIER_ORDER)[number])) {
      modifiers.add(canonical);
    } else {
      key = canonical;
    }
  }
  if (!key) return "";
  return [...MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier)), key].join(" ");
}

/** Convert a keyboard event into the same internal form used by settings. */
export function eventToHotkey(event: KeyboardEvent): string {
  const key = event.key;
  if (MODIFIER_ORDER.includes(key as (typeof MODIFIER_ORDER)[number])) return "";
  if (key === "Control" || key === "Alt" || key === "Shift" || key === "Meta") return "";
  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  if (event.metaKey) parts.push("Meta");
  const canonical =
    key === " " || event.code === "Space" ? "Space" : canonicalKey(key);
  if (!canonical) return "";
  return [...parts, canonical].join(" ");
}

export function matchesHotkey(event: KeyboardEvent, combo: string): boolean {
  const expected = normalizeHotkey(combo);
  if (!expected) return false;
  return eventToHotkey(event) === expected;
}

export function prettyHotkey(input: string): string {
  return normalizeHotkey(input)
    .split(" ")
    .map((token) => PRETTY_KEYS[token] ?? token)
    .filter(Boolean)
    .join(" ");
}

export function hotkeysEqual(a: string, b: string): boolean {
  return normalizeHotkey(a) === normalizeHotkey(b);
}
