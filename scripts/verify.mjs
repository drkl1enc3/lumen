import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "/tmp/opencode/ui";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(String(err)));

const shot = async (name) => {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot", name);
};

await page.goto("http://localhost:1420/#/");
await page.waitForSelector(".wave-hero");
await shot("01-home-empty");

await page.locator(".wave-hero").click();
await page.waitForSelector("#global-search");
await shot("02-search-empty");

await page.locator('.rail a[title="SoundCloud"]').click();
await page.waitForSelector(".source-hero.is-soundcloud");
await shot("03-soundcloud");

await page.locator('.rail a[title="YouTube"]').click();
await page.waitForSelector(".source-hero.is-youtube");
await shot("04-youtube");

await page.locator('.rail a[title="Библиотека"]').click();
await shot("05-library-empty");

await page.locator(".segmented-item:has-text('Любимые треки')").click();
await shot("06-favorites-empty");

await page.locator(".segmented-item:has-text('Локальные')").click();
await shot("07-local-empty");

await page.goto("http://localhost:1420/#/history");
await page.waitForTimeout(400);
await shot("08-history-empty");

await page.locator(".titlebar [title='Настройки']").click();
await shot("09-settings");

const settingsTabs = [
  ["Воспроизведение", "10-settings-playback"],
  ["Оформление", "11-settings-appearance"],
  ["Плейлисты", "12-settings-playlists"],
  ["Интеграции", "13-settings-integrations"],
  ["Хранилище", "14-settings-storage"],
  ["О программе", "15-settings-about"],
];
for (const [title, name] of settingsTabs) {
  await page.locator(`.settings-rail-item[title="${title}"]`).click();
  await shot(name);
}

await page.locator('.settings-rail-item[title="Оформление"]').click();
await page.locator(".accent-swatch").nth(1).click();
const accent = await page.evaluate(() => document.documentElement.dataset.accent);
console.log("accent =", accent);
await page.locator(".accent-swatch").nth(0).click();

await page.locator('.settings-rail-item[title="Основные"]').click();
await page.locator(".lang-card").filter({ hasText: "English" }).click();
await page.waitForTimeout(300);
const englishTitle = await page.locator(".settings-head h1").textContent();
console.log("english applied:", englishTitle === "General");
await shot("16-settings-english");
await page.locator(".lang-card").filter({ hasText: "Русский" }).click();
await page.keyboard.press("Escape");

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
