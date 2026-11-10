import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "/home/rose/lumen/docs/screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function pageWithContext() {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    locale: "ru-RU",
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error("pageerror", String(e)));
  return { context, page };
}

async function shot(page, name, wait = 500) {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("saved", name);
}

// banner
{
  const { context, page } = await pageWithContext();
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#050506">
  <div style="width:1600px;height:430px;position:relative;overflow:hidden;display:flex;align-items:center;gap:46px;padding:0 92px;box-sizing:border-box;
    background:
      radial-gradient(820px 480px at 16% 0%, rgba(141,107,255,.32), transparent 62%),
      radial-gradient(700px 520px at 92% 110%, rgba(94,234,212,.14), transparent 60%),
      linear-gradient(135deg,#0d0b16 0%,#07070a 55%,#0b0814 100%);
    font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif;">
    <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:52px 52px;mask-image:radial-gradient(circle at 30% 50%,#000,transparent 75%)"></div>
    <div style="position:relative;width:150px;height:150px;border-radius:38px;background:linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;box-shadow:0 30px 80px rgba(0,0,0,.5)">
      <svg viewBox="0 0 32 32" width="92" height="92">
        <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e4dbff"/><stop offset="1" stop-color="#8d6bff"/></linearGradient></defs>
        <circle cx="16" cy="16" r="13" fill="none" stroke="url(#lg)" stroke-width="1.7"/>
        <circle cx="16" cy="16" r="5" fill="url(#lg)"/>
        <g stroke="url(#lg)" stroke-width="1.7" stroke-linecap="round"><path d="M16 1v4"/><path d="M16 27v4"/><path d="M1 16h4"/><path d="M27 16h4"/></g>
      </svg>
    </div>
    <div style="position:relative">
      <div style="font-size:13px;letter-spacing:.42em;text-transform:uppercase;color:#8f8a9e;margin-bottom:10px">music player · linux</div>
      <h1 style="margin:0;font-size:104px;line-height:.95;letter-spacing:-5px;background:linear-gradient(120deg,#ffffff,#cfc2ff 55%,#8d6bff);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:700">Lumen</h1>
      <p style="margin:16px 0 24px;font-size:24px;color:#b4b0c0;max-width:760px;line-height:1.35">Бесплатный музыкальный плеер с глубокой кастомизацией.<br/>Темы, фон, частицы, визуализатор, стили плеера и обложек.</p>
      <div style="display:flex;gap:10px">
        <span style="padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);font-size:13px;color:#d9d4e6">Tauri 2</span>
        <span style="padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);font-size:13px;color:#d9d4e6">React 19</span>
        <span style="padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);font-size:13px;color:#d9d4e6">TypeScript</span>
        <span style="padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);font-size:13px;color:#d9d4e6">UI Preview</span>
      </div>
    </div>
    <svg style="position:absolute;right:-30px;bottom:0;opacity:.5" width="560" height="260" viewBox="0 0 560 260" fill="none">
      <defs><linearGradient id="w" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#8d6bff" stop-opacity="0"/><stop offset=".5" stop-color="#b3a1ff"/><stop offset="1" stop-color="#5eead4" stop-opacity="0"/></linearGradient></defs>
      <g stroke="url(#w)" stroke-width="2.4" stroke-linecap="round">
        <path d="M0 150c40-70 80-70 120 0s80 70 120 0 80-70 120 0 80 70 120 0 60-30 80-20"/>
        <path d="M0 190c40-40 80-40 120 0s80 40 120 0 80-40 120 0 80 40 120 0 60-20 80-14" opacity=".5"/>
      </g>
    </svg>
  </div></body></html>`);
  await page.waitForTimeout(300);
  await page.locator("body > div").first().screenshot({ path: `${OUT}/hero.png` });
  console.log("saved hero");
  await context.close();
}

// home + queue + now playing + mini
{
  const { context, page } = await pageWithContext();
  await page.goto("http://localhost:1420/#/");
  await page.waitForSelector(".wave-hero");
  await page.locator(".wave-hero").click();
  await shot(page, "01-home", 4200);

  await page.locator('.playerbar [title="Очередь"]').click();
  await shot(page, "02-queue", 600);

  await page.locator('.playerbar [title="На весь экран"]').click();
  await shot(page, "03-now-playing", 900);
  await context.close();
}

// mini player (clean page, no queue)
{
  const { context, page } = await pageWithContext();
  await page.goto("http://localhost:1420/#/");
  await page.waitForSelector(".wave-hero");
  await page.locator(".wave-hero").click();
  await page.waitForTimeout(4200);
  await page.locator('.playerbar [title="Мини-плеер"]').click();
  await shot(page, "04-mini-player", 700);
  await context.close();
}

// search
{
  const { context, page } = await pageWithContext();
  await page.goto("http://localhost:1420/#/search");
  await page.waitForSelector("#global-search");
  await page.locator("#global-search").fill("neon");
  await shot(page, "05-search", 700);
  await context.close();
}

// library
{
  const { context, page } = await pageWithContext();
  await page.goto("http://localhost:1420/#/library");
  await page.waitForSelector(".segmented");
  await shot(page, "06-library", 500);
  await page.locator(".media-card").nth(1).click();
  await shot(page, "07-playlist", 700);
  await context.close();
}

// artist
{
  const { context, page } = await pageWithContext();
  await page.goto("http://localhost:1420/#/artist/neon-harbor");
  await page.waitForSelector(".artist-hero");
  await shot(page, "08-artist", 600);
  await context.close();
}

// settings: appearance, background, player
{
  const { context, page } = await pageWithContext();
  await page.goto("http://localhost:1420/#/");
  await page.waitForSelector(".wave-hero");
  await page.keyboard.press("Control+,");
  await page.locator('.settings-rail-item[title="Оформление"]').click();
  await shot(page, "09-settings-appearance", 500);

  await page.locator('.settings-rail-item[title="Фон"]').click();
  await page.locator(".particle-card").nth(1).click();
  await shot(page, "10-settings-background", 600);

  await page.locator('.settings-rail-item[title="Плеер"]').click();
  await page.locator('.setting-row:has-text("Визуализатор") select').selectOption("bars");
  await shot(page, "11-settings-player", 700);
  await context.close();
}

// light theme home
{
  const { context, page } = await pageWithContext();
  await page.goto("http://localhost:1420/#/");
  await page.waitForSelector(".wave-hero");
  await page.keyboard.press("Control+,");
  await page.locator('.settings-rail-item[title="Оформление"]').click();
  await page.locator(".theme-card").nth(1).click();
  await page.keyboard.press("Escape");
  await page.locator(".wave-hero").click();
  await shot(page, "12-light-theme", 4200);
  await context.close();
}

// particles on home
{
  const { context, page } = await pageWithContext();
  await page.goto("http://localhost:1420/#/");
  await page.waitForSelector(".wave-hero");
  await page.keyboard.press("Control+,");
  await page.locator('.settings-rail-item[title="Фон"]').click();
  await page.locator(".particle-card").nth(1).click();
  await page.locator('.setting-row:has-text("Количество частиц") input[type=range]').fill("110");
  await page.locator('.setting-row:has-text("Размер частиц") input[type=range]').fill("3");
  await page.keyboard.press("Escape");
  await shot(page, "13-particles", 1500);
  await context.close();
}

await browser.close();
