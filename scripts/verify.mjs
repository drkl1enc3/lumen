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
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot", name);
};

await page.goto("http://localhost:1420/#/");
await page.waitForSelector(".wave-hero");
await shot("01-home");

// start the wave -> player bar appears
await page.locator(".wave-hero").click();
await page.waitForSelector(".playerbar");
await shot("02-player");

// queue
await page.locator('.playerbar [title="Очередь"]').click();
await shot("03-queue");
await page.locator('.queue-panel [title="Закрыть"]').click();

// search
await page.locator('.rail a[title="Поиск"]').click();
await page.locator("#global-search").fill("neon");
await shot("04-search");

// play first result
await page.locator(".track-row").first().click();
await page.waitForTimeout(400);

// context menu
await page.locator(".track-row").first().click({ button: "right" });
await shot("05-context");
await page.keyboard.press("Escape");

// now playing
await page.locator('.playerbar [title="На весь экран"]').click();
await shot("06-nowplaying");
await page.keyboard.press("Escape");

// library
await page.locator('.rail a[title="Библиотека"]').click();
await shot("07-library");

// open first playlist
await page.locator(".media-card").nth(1).click();
await shot("08-playlist");

// artist from playlist track? go home then artist page
await page.locator('.rail a[title="Главная"]').click();
await page.locator(".top-row").first().click(); // opens artist? first top row plays track
await page.locator('.rail a[title="Библиотека"]').click();
await page.locator('.segmented-item:has-text("Артисты")').click();
await shot("09-artists");
await page.locator(".media-card").first().click();
await shot("10-artist");

// mini player
await page.locator('.playerbar [title="Мини-плеер"]').click();
await shot("11-mini");
await page.locator('.mini-player [aria-label="Закрыть"]').click();

// settings
await page.locator('.titlebar [title="Настройки"]').click();
await shot("12-settings-general");

const settingsTabs = [
  ["Воспроизведение", "13-settings-playback"],
  ["Оформление", "14-settings-appearance"],
  ["Управление", "15-settings-controls"],
  ["Горячие клавиши", "16-settings-hotkeys"],
  ["Интеграции", "17-settings-integrations"],
  ["Хранилище", "18-settings-storage"],
  ["О программе", "19-settings-about"],
];
for (const [title, name] of settingsTabs) {
  await page.locator(`.settings-rail-item[title="${title}"]`).click();
  await shot(name);
}

// accent theme
await page.locator('.settings-rail-item[title="Оформление"]').click();
await page.locator(".accent-swatch").nth(1).click();
const accent = await page.evaluate(() => document.documentElement.dataset.accent);
console.log("accent =", accent);
await page.locator(".accent-swatch").nth(0).click();

// language switch
await page.locator('.settings-rail-item[title="Основные"]').click();
await page.locator(".lang-card").filter({ hasText: "English" }).click();
await page.waitForTimeout(300);
const englishTitle = await page.locator(".settings-head h1").textContent();
console.log("english applied:", englishTitle === "General");
await shot("20-settings-english");

// back to russian
await page.locator(".lang-card").filter({ hasText: "Русский" }).click();
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// album page
await page.locator('.rail a[title="Главная"]').click();
await page.locator(".recent-card").first().click();
await page.waitForTimeout(300);
await shot("21-home-playing");

// history page
await page.locator('.rail a[title="Главная"]').click();
await page.locator(".home-tile").first().click();
await shot("22-history");

// login modal
await page.locator('.rail-item[title="Войти"]').click();
await shot("23-login");
await page.keyboard.press("Escape");

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
