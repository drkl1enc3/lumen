import { chromium } from "playwright";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(String(error)));

await page.goto("http://localhost:1420/#/");
await page.waitForSelector(".wave-hero");

await page.keyboard.press("Control+,");
await page.waitForSelector(".settings-panel");
await page.locator(".lang-card").filter({ hasText: "English" }).click();
await page.waitForTimeout(200);
await page.locator('.settings-rail-item[title="Appearance"]').click();
await page.waitForTimeout(200);
await page.locator(".accent-swatch").nth(1).click();
const accent = await page.evaluate(() => document.documentElement.dataset.accent);
if (accent !== "emerald") throw new Error(`accent was ${accent}`);

const heading = await page.locator(".settings-head h1").textContent();
if (heading !== "Appearance") throw new Error(`heading was ${heading}`);

await page.reload();
await page.waitForSelector(".wave-hero");
const savedAccent = await page.evaluate(() => document.documentElement.dataset.accent);
const savedLanguage = await page.evaluate(() => document.documentElement.lang);
const stored = await page.evaluate(() => localStorage.getItem("lumen.settings.v2"));
if (savedAccent !== "emerald") throw new Error(`saved accent was ${savedAccent}`);
if (savedLanguage !== "en") throw new Error(`saved language was ${savedLanguage}`);
if (!stored || !stored.includes('"accent":"emerald"')) throw new Error("settings were not persisted");

await page.keyboard.press("Control+k");
await page.waitForTimeout(300);
if (!page.url().includes("/search")) throw new Error(`search hotkey did not navigate: ${page.url()}`);
await page.keyboard.press("Control+,");
await page.waitForSelector(".settings-panel");
await page.keyboard.press("Escape");
await page.waitForSelector(".settings-panel", { state: "detached" });

console.log("UI persistence and hotkeys: OK");
console.log("console errors:", errors.length ? errors : "none");
await browser.close();
