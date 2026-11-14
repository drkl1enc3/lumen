declare const __APP_VERSION__: string | undefined;

/** Injected by Vite from package.json; falls back to a safe literal. */
export const APP_VERSION =
  typeof __APP_VERSION__ === "string" && __APP_VERSION__ ? __APP_VERSION__ : "0.2.0";
