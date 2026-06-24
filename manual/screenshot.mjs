/**
 * AJS Redzone Portal — manual screenshot script
 * Captures all three portals: Admin, Redzone PM, Workshop (manufacturing).
 *
 * Usage: node manual/screenshot.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = "https://mutkxagbagutlqhfesdm.supabase.co";
const SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11dGt4YWdiYWd1dGxxaGZlc2RtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMyNTg3MSwiZXhwIjoyMDk1OTAxODcxfQ.T3rnt5ZAX_UbjrJC8fGzhb4Fnn1GEXl9Dov90oBQKqs";
const BASE_URL     = "https://redzone.ajsspalding.co.uk";
const OUT_DIR      = path.join(__dirname, "screenshots");

const ADMIN_EMAIL     = "james@ajsspalding.co.uk";
const REDZONE_EMAIL   = "james@jamestaylor.uk";        // rz_pm
const WORKSHOP_EMAIL  = "workshop-test@ajsspalding.co.uk"; // temp standard user

// ── Page lists ────────────────────────────────────────────────────────────────

const ADMIN_PAGES = [
  ["admin-01-login",               "/admin/login",                         "form"],
  ["admin-02-orders",              "/admin/orders",                        "table, h1"],
  ["admin-03-orders-confirmed",    "/admin/orders?status=order_confirmed", "table, h1"],
  ["admin-04-order-detail",        null,                                   null],   // filled in at runtime
  ["admin-05-products",            "/admin/products",                      "table"],
  ["admin-06-product-new",         "/admin/products/new",                  "form"],
  ["admin-07-users",               "/admin/users",                         "table, h1"],
  ["admin-08-redzone-pms",         "/admin/redzone-pms",                   "h1"],
  ["admin-09-crm",                 "/admin/crm",                           "h1"],
  ["admin-10-crm-contacts",        "/admin/crm/contacts",                  "table, h1"],
  ["admin-11-installation-quotes", "/admin/installation-quotes",           "h1"],
  ["admin-12-pipeline",            "/admin/pipeline",                      "h1"],
  ["admin-13-settings",            "/admin/settings",                      "h1"],
];

const REDZONE_PAGES = [
  ["redzone-01-login",             "/redzone/login",         "form"],
  ["redzone-02-quotes",            "/redzone/quotes",        "h1"],
  ["redzone-03-quote-detail",      null,                     null],  // filled at runtime
];

const WORKSHOP_PAGES = [
  ["workshop-01-dashboard",        "/manufacturing",                  "h1, main"],
  ["workshop-02-orders",           "/manufacturing/orders",           "table, h1"],
  ["workshop-03-order-detail",     null,                              null],  // filled at runtime
  ["workshop-04-pipeline",         "/manufacturing/pipeline",         "h1"],
  ["workshop-05-products",         "/manufacturing/products",         "table, h1"],
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function magicLink(email) {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error || !data?.properties?.hashed_token) throw new Error(`Magic link failed for ${email}: ${error?.message}`);
  return `${BASE_URL}/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink`;
}

async function authenticatedContext(browser, email) {
  const url = await magicLink(email);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  console.log(`  Authenticated ${email} → now at ${p.url()}`);
  await p.waitForTimeout(800);
  return { ctx, page: p };
}

async function shot(page, name, urlPath, waitFor) {
  if (!urlPath) return; // runtime-filled entries skipped if null
  const url = `${BASE_URL}${urlPath}`;
  console.log(`  ${name} → ${urlPath}`);
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
    if (waitFor) await page.waitForSelector(waitFor, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
  } catch (e) {
    console.warn(`    ✗ ${e.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Fetch a real order id and redzone quote id to use for detail screenshots
  const [{ data: orders }, { data: rzQuotes }] = await Promise.all([
    supabase.from("quotes").select("id").not("status", "eq", "revised").order("created_at", { ascending: false }).limit(1),
    supabase.from("quotes").select("id").not("rz_pm_id", "is", null).order("created_at", { ascending: false }).limit(1),
  ]);
  const orderId  = orders?.[0]?.id;
  const rzQuoteId = rzQuotes?.[0]?.id;

  // Create temporary workshop user
  console.log("\nCreating temporary workshop user…");
  let tempUserId;
  try {
    const { data: tmpUser } = await supabase.auth.admin.createUser({
      email: WORKSHOP_EMAIL,
      email_confirm: true,
      app_metadata: { role: "standard" },
    });
    tempUserId = tmpUser?.user?.id;
    console.log(`  Created: ${WORKSHOP_EMAIL} (${tempUserId})`);
  } catch (e) {
    console.warn("  Workshop user may already exist:", e.message);
  }

  const browser = await chromium.launch({ headless: true });

  // ── Admin screenshots ────────────────────────────────────────────────────
  console.log("\n── Admin portal ─────────────────────────────────────");

  // Login page (unauthenticated)
  const anonCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const anonPage = await anonCtx.newPage();
  await anonPage.goto(`${BASE_URL}/admin/login`, { waitUntil: "networkidle" });
  await anonPage.screenshot({ path: path.join(OUT_DIR, "admin-01-login.png"), fullPage: true });
  console.log("  admin-01-login");
  await anonCtx.close();

  const { ctx: adminCtx, page: adminPage } = await authenticatedContext(browser, ADMIN_EMAIL);
  for (const [name, urlPath, waitFor] of ADMIN_PAGES) {
    if (name === "admin-01-login") continue; // already done above
    const resolvedPath = name === "admin-04-order-detail" && orderId
      ? `/admin/orders/${orderId}`
      : urlPath;
    await shot(adminPage, name, resolvedPath, waitFor);
  }
  await adminCtx.close();

  // ── Redzone screenshots ──────────────────────────────────────────────────
  console.log("\n── Redzone PM portal ────────────────────────────────");

  // Login page (unauthenticated)
  const rzAnonCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const rzAnonPage = await rzAnonCtx.newPage();
  await rzAnonPage.goto(`${BASE_URL}/redzone/login`, { waitUntil: "networkidle" });
  await rzAnonPage.screenshot({ path: path.join(OUT_DIR, "redzone-01-login.png"), fullPage: true });
  console.log("  redzone-01-login");
  await rzAnonCtx.close();

  const { ctx: rzCtx, page: rzPage } = await authenticatedContext(browser, REDZONE_EMAIL);
  for (const [name, urlPath, waitFor] of REDZONE_PAGES) {
    if (name === "redzone-01-login") continue;
    const resolvedPath = name === "redzone-03-quote-detail" && rzQuoteId
      ? `/redzone/quotes/${rzQuoteId}`
      : urlPath;
    await shot(rzPage, name, resolvedPath, waitFor);
  }
  await rzCtx.close();

  // ── Workshop screenshots ─────────────────────────────────────────────────
  console.log("\n── Workshop portal ──────────────────────────────────");
  const { ctx: wsCtx, page: wsPage } = await authenticatedContext(browser, WORKSHOP_EMAIL);
  for (const [name, urlPath, waitFor] of WORKSHOP_PAGES) {
    const resolvedPath = name === "workshop-03-order-detail" && orderId
      ? `/manufacturing/orders/${orderId}`
      : urlPath;
    await shot(wsPage, name, resolvedPath, waitFor);
  }
  await wsCtx.close();

  await browser.close();

  // Clean up temp workshop user
  if (tempUserId) {
    await supabase.auth.admin.deleteUser(tempUserId);
    console.log(`\nCleaned up temp workshop user (${WORKSHOP_EMAIL})`);
  }

  // List what was captured
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith(".png")).sort();
  console.log(`\n✓ ${files.length} screenshots saved to manual/screenshots/`);
  files.forEach(f => console.log(`  ${f}`));
}

main().catch(e => { console.error(e); process.exit(1); });
