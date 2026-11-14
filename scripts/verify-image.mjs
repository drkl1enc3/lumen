import { chromium } from "playwright";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

await page.goto("http://localhost:1420/#/");
await page.waitForSelector(".wave-hero");
await page.keyboard.press("Control+,");
await page.waitForSelector(".settings-panel");
await page.locator(".lang-card").filter({ hasText: "English" }).click();
await page.waitForTimeout(150);
await page.locator('.settings-rail-item[title="Background"]').click();
await page.waitForTimeout(150);

const input = page.locator('.settings-panel input[type="file"]').first();
await input.setInputFiles("/tmp/opencode/large.png");
await page.waitForTimeout(1500);

const result = await page.evaluate(() => {
  const raw = localStorage.getItem("lumen.settings.v2") ?? "";
  const data = JSON.parse(raw);
  return {
    length: raw.length,
    imageLength: String(data?.state?.bgImage ?? "").length,
    prefix: String(data?.state?.bgImage ?? "").slice(0, 30),
  };
});
if (!result.imageLength) throw new Error("background image was not stored");
if (result.imageLength > 3_500_000) throw new Error(`compressed image is too large: ${result.imageLength}`);
if (!result.prefix.startsWith("data:image/")) throw new Error(`unexpected image prefix ${result.prefix}`);
console.log("Image compression:", result);
console.log("console errors:", errors.length ? errors : "none");
await browser.close();
