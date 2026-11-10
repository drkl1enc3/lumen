import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "/tmp/opencode/ui2";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot", name);
};

await page.goto("http://localhost:1420/#/");
await page.waitForSelector(".wave-hero");
await page.locator(".wave-hero").click();
await page.waitForTimeout(400);

await page.keyboard.press("Control+,");
await shot("01-general");

await page.locator('.settings-rail-item[title="Оформление"]').click();
await shot("02-appearance");

await page.locator(".theme-card").nth(1).click();
await shot("03-light-theme");

await page.locator('.settings-rail-item[title="Фон"]').click();
await shot("04-background");
await page.locator(".particle-card").nth(1).click();
await page.keyboard.press("Escape");
await shot("05-light-snow-home");

await page.keyboard.press("Control+,");
await page.locator('.settings-rail-item[title="Оформление"]').click();
await page.locator(".theme-card").nth(3).click();
await shot("06-custom-theme");
const colorInput = page.locator(".color-chip input").nth(1);
await colorInput.evaluate((el) => {
  el.value = "#ff3355";
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
});
await shot("07-custom-accent");
await page.keyboard.press("Escape");

await page.keyboard.press("Control+,");
await page.locator('.settings-rail-item[title="Вкладки"]').click();
await shot("08-tabs");
await page.locator('.settings-rail-item[title="Панель"]').click();
await shot("09-panel");
await page.locator('.settings-rail-item[title="Обложка"]').click();
await shot("10-cover");
await page.locator('.settings-rail-item[title="Плеер"]').click();
await shot("11-player");

await page.locator('.choice-card:has-text("Пластинка")').click();
await page.locator('.choice-card:has-text("Волновой")').click();
await page.keyboard.press("Escape");
await shot("12-vinyl-player");

await page.keyboard.press("Control+,");
await page.locator('.settings-rail-item[title="Обложка"]').click();
await page.locator('.setting-row:has-text("Обложка в обложке") .toggle').click();
await page.locator('.setting-row:has-text("Визуализатор на обложке") .toggle').click();
await page.keyboard.press("Escape");
await page.locator('.playerbar [title="На весь экран"]').click();
await shot("13-nowplaying-custom");
await page.keyboard.press("Escape");

console.log("errors:", errors.length ? errors : "none");
await browser.close();
