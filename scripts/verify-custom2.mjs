import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "/tmp/opencode/ui3";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

const shot = async (name) => {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot", name);
};
const tab = (title) => page.locator(`.settings-rail-item[title="${title}"]`).click();

await page.goto("http://localhost:1420/#/");
await page.waitForSelector(".wave-hero");
await page.locator(".wave-hero").click();
await page.waitForTimeout(300);

// background image + particles
await page.keyboard.press("Control+,");
await tab("Фон");
await page.locator(".settings-group input[type=file]").first().setInputFiles("/tmp/opencode/bg-test.png");
await page.locator(".particle-card").nth(4).click();
await page.locator('.setting-row:has-text("Количество частиц") input[type=range]').fill("110");
await shot("01-bg-settings");
await page.keyboard.press("Escape");
await shot("02-bg-home");

// player visualizer on cover
await page.keyboard.press("Control+,");
await tab("Плеер");
await page.locator('.setting-row:has-text("Визуализатор") select').selectOption("bars");
await page.keyboard.press("Escape");
await page.locator('.playerbar [title="На весь экран"]').click();
await shot("03-nowplaying-viz");
await page.keyboard.press("Escape");

// light + serif + large radius + larger font
await page.keyboard.press("Control+,");
await tab("Оформление");
await page.locator(".theme-card").nth(1).click();
await page.locator('.setting-row:has-text("Семейство шрифта") select').selectOption("serif");
await page.locator('.choice-card:has-text("Большое")').click();
await page.locator('.setting-row:has-text("Размер шрифта") input[type=range]').fill("18");
await shot("04-light-serif");
await page.keyboard.press("Escape");
await shot("05-light-home");

// tabs position left on library
await page.locator('.rail a[title="Библиотека"]').click();
await page.keyboard.press("Control+,");
await tab("Вкладки");
await page.locator('.choice-card:has-text("Слева")').first().click();
await page.locator('.choice-card:has-text("Полный")').click();
await page.keyboard.press("Escape");
await shot("06-library-left-tabs");

// panel elements: hide title and logo, compact
await page.keyboard.press("Control+,");
await tab("Панель");
await page.locator('.choice-card:has-text("Компактный")').click();
await page.locator('.control-tile:has-text("Название вкладки")').click();
await page.locator('.control-tile:has-text("Логотип")').click();
await page.keyboard.press("Escape");
await shot("07-panel-compact");

console.log("errors:", errors.length ? errors : "none");
await browser.close();
