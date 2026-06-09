/**
 * Automated screenshot capture for the AJS Redzone slide deck.
 * Usage:
 *   npx playwright install chromium   (first time only)
 *   node scripts/take-screenshots.mjs
 *
 * Optional env vars:
 *   BASE_URL          — override live site (default: https://ajs-redzone-portal.vercel.app)
 *   QUOTE_URL         — full URL of a real quote edit page for the customer view screenshot
 *                       e.g. https://ajs-redzone-portal.vercel.app/quote/Q26-RZ0001/edit?token=abc123
 */

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "screenshots");
fs.mkdirSync(OUT, { recursive: true });

const BASE = process.env.BASE_URL ?? "https://ajs-redzone-portal.vercel.app";
const QUOTE_URL = process.env.QUOTE_URL ?? null;

const W = 1280;
const H = 800;

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  ✓ ${name}`);
}

async function setLocale(context, locale) {
  await context.clearCookies();
  if (locale !== "en") {
    await context.addCookies([{
      name: "ajs_locale",
      value: locale,
      domain: new URL(BASE).hostname,
      path: "/",
    }]);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  // ── 1. Catalogue — EN / GBP ──────────────────────────────────────────────
  console.log("\nCatalogue — EN / GBP");
  {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Control Panels", { timeout: 15000 });
    await shot(page, "01_catalogue_en_gbp.png");
    await ctx.close();
  }

  // ── 2. Catalogue — EN / EUR ──────────────────────────────────────────────
  console.log("Catalogue — EN / EUR");
  {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Control Panels");
    // Click the EUR toggle button
    const eurBtn = page.locator("button", { hasText: "EUR" }).first();
    if (await eurBtn.isVisible()) {
      await eurBtn.click();
      await page.waitForTimeout(600);
    }
    await shot(page, "02_catalogue_en_eur.png");
    await ctx.close();
  }

  // ── 3. Catalogue — German ────────────────────────────────────────────────
  console.log("Catalogue — German");
  {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await setLocale(ctx, "de");
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Schalttafeln", { timeout: 15000 });
    await shot(page, "03_catalogue_de.png");
    await ctx.close();
  }

  // ── 4. Catalogue — French ────────────────────────────────────────────────
  console.log("Catalogue — French");
  {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await setLocale(ctx, "fr");
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Panneaux de commande", { timeout: 15000 });
    await shot(page, "04_catalogue_fr.png");
    await ctx.close();
  }

  // ── 5. Basket open with items ────────────────────────────────────────────
  console.log("Basket — open with items");
  {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Control Panels");

    // Add 2 products by clicking + on the first two cards in the panels section
    const plusBtns = page.locator('button[aria-label="Increase quantity"]');
    const count = await plusBtns.count();
    if (count >= 1) await plusBtns.nth(0).click();
    if (count >= 2) await plusBtns.nth(1).click();
    await page.waitForTimeout(400);

    // Open basket drawer — the header basket button has a 🛒 emoji and count badge
    await page.locator("header button", { hasText: /🛒/ }).first().click();
    await page.waitForTimeout(600);
    await shot(page, "05_basket_open.png");
    await ctx.close();
  }

  // ── 6. Checkout form ─────────────────────────────────────────────────────
  console.log("Checkout form");
  {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Control Panels");

    // Add a product then proceed to checkout
    const plusBtns = page.locator('button[aria-label="Increase quantity"]');
    if (await plusBtns.count() > 0) await plusBtns.first().click();
    await page.waitForTimeout(300);

    // Open basket and click checkout
    await page.locator("header button", { hasText: /🛒/ }).first().click();
    await page.waitForTimeout(400);

    const checkoutBtn = page.locator("button", { hasText: /checkout|Kasse|commande/i }).first();
    if (await checkoutBtn.isVisible()) {
      await checkoutBtn.click();
      await page.waitForTimeout(800);
    }
    await shot(page, "06_checkout_form.png");
    await ctx.close();
  }

  // ── 7. RZ PM Login page ──────────────────────────────────────────────────
  console.log("RZ PM Login");
  {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/redzone/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await shot(page, "07_rz_login.png");
    await ctx.close();
  }

  // ── 8. Language selector close-up ────────────────────────────────────────
  console.log("Language selector (flags visible)");
  {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Control Panels");
    // Scroll to top to make sure header is fully visible
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    // Crop to just the header area
    await page.screenshot({
      path: path.join(OUT, "08_header_language_currency.png"),
      clip: { x: 0, y: 0, width: W, height: 80 },
    });
    console.log("  ✓ 08_header_language_currency.png");
    await ctx.close();
  }

  // ── 9. Optional: real quote view ─────────────────────────────────────────
  if (QUOTE_URL) {
    console.log("Quote view (customer)");
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await ctx.newPage();
    await page.goto(QUOTE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await shot(page, "09_quote_view.png");
    await ctx.close();
  } else {
    console.log("Quote view — skipped (set QUOTE_URL env var to include)");
  }

  await browser.close();
  console.log(`\nAll screenshots saved to: ${OUT}\n`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
