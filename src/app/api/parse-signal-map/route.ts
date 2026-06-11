import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedItem {
  productId: string;
  sku: string;
  name: string;
  qty: number;
  unitPricePence: number;
}

interface ParseResult {
  customerName: string;
  siteName: string;
  items: ParsedItem[];
  vfItems: ParsedItem[];
  unmatchedSensors: string[];
  unmatchedDevices: string[];
  notInCatalogue: string[];
}

type DbProduct = { id: string; sku: string; name: string; price_gbp_pence: number };

// ---------------------------------------------------------------------------
// Panel / sensor SKU derivation
// ---------------------------------------------------------------------------

function panelSku(inputCount: number, plcMaker: string, ssFlag: number): string {
  const size = inputCount <= 8 ? 8 : inputCount <= 16 ? 16 : 24;
  const m = plcMaker.toLowerCase();
  const plc = m.includes("siemens") ? "SI" : (m.includes("allen") || m.includes("bradley")) ? "AB" : "SI";
  return `AJS-${plc}-${ssFlag === 1 ? "SS" : "MS"}-${size}`;
}

function sensorSku(label: string): string | null {
  const l = label.toLowerCase();
  if (l.includes("lr-z") || l.includes("laser"))                      return "AJS-LRZ-SENSOR";
  if (l.includes("pz-v") || l.includes("photoeye") || l.includes("photo eye")) return "AJS-PZV-SENSOR";
  if (l.includes("prox"))                                               return "AJS-8MM-SENSOR";
  if (l.includes("relay"))                                              return "AJS-RELAY";
  return null;
}

function skipSensor(label: string): boolean {
  return /customer sensor|push button|plc counter|totalizer|manual|no sensor/i.test(label);
}

// ---------------------------------------------------------------------------
// Visual Factory device matching — uses SKU patterns (reliable, name-agnostic)
//
// Known SKU conventions:
//   AJS-STREAM         → Google Streamer (was Apple TV Box)
//   AJS-55-DISPLAY     → 55" TV / display
//   AJS-65-DISPLAY     → 65" TV / display
//   AJS-DISPLAY-ENC    → IP rated enclosure (Protech)
//   AJS-TABLET-*       → tablets (skipped)
// ---------------------------------------------------------------------------

function findVfProduct(deviceLabel: string, vfProducts: DbProduct[]): DbProduct | null {
  const l = deviceLabel.toLowerCase().trim();

  // Skip tablets — separate purchasing decision
  if (l.includes("ipad") || l.includes("tablet")) return null;

  // Apple TV Box → streaming device (SKU contains STREAM)
  if (l.includes("apple tv") || l.includes("appletv")) {
    return vfProducts.find((p) => /stream/i.test(p.sku)) ?? null;
  }

  // Enclosures — SKU contains ENC; size-specific first, no cross-size fallback
  if (l.includes("enclosure")) {
    const size = l.includes("65") ? "65" : "55";
    return (
      vfProducts.find((p) => /enc/i.test(p.sku) && p.sku.includes(size)) ??
      (l.includes("65") ? null : vfProducts.find((p) => /enc/i.test(p.sku))) ??
      null
    );
  }

  // 55" TV / display — SKU contains 55, not ENC
  if (l.includes("55")) {
    return vfProducts.find((p) => p.sku.includes("55") && !/enc/i.test(p.sku)) ?? null;
  }

  // 65" TV / display — SKU contains 65, not ENC
  if (l.includes("65")) {
    return vfProducts.find((p) => p.sku.includes("65") && !/enc/i.test(p.sku)) ?? null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Cell helpers
// ---------------------------------------------------------------------------

function cellStr(ws: XLSX.WorkSheet, col: string, row: number): string {
  const cell = ws[`${col}${row}`];
  return cell ? String(cell.v ?? "").trim() : "";
}

function cellNum(ws: XLSX.WorkSheet, col: string, row: number): number {
  const cell = ws[`${col}${row}`];
  if (!cell) return 0;
  const n = Number(cell.v);
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  let wb: XLSX.WorkBook;
  try {
    const buf = Buffer.from(await (file as File).arrayBuffer());
    wb = XLSX.read(buf, { type: "buffer" });
  } catch (err) {
    return NextResponse.json(
      { error: `Could not read file: ${err instanceof Error ? err.message : String(err)}` },
      { status: 422 }
    );
  }

  const genSheet  = wb.Sheets["General"] ?? wb.Sheets[wb.SheetNames[0]];
  const hwSheet   = wb.Sheets["Hardware Summary"];

  if (!hwSheet) {
    return NextResponse.json(
      { error: 'Sheet "Hardware Summary" not found — is this a Redzone Signal Map?' },
      { status: 422 }
    );
  }

  const customerName = genSheet ? cellStr(genSheet, "B", 3) : "";
  const siteName     = genSheet ? cellStr(genSheet, "B", 4) : "";

  // ── Panels (cols C/D/E, rows 3-12) ──────────────────────────────────────
  const panelSkuMap = new Map<string, number>();
  for (let row = 3; row <= 12; row++) {
    const inputs = cellNum(hwSheet, "C", row);
    if (inputs <= 0) continue;
    const sku = panelSku(inputs, cellStr(hwSheet, "D", row), cellNum(hwSheet, "E", row));
    panelSkuMap.set(sku, (panelSkuMap.get(sku) ?? 0) + 1);
  }

  // ── Sensors (cols H/I, rows 3-12) ────────────────────────────────────────
  const sensorSkuMap   = new Map<string, number>();
  const unmatchedSensors: string[] = [];
  for (let row = 3; row <= 12; row++) {
    const label = cellStr(hwSheet, "H", row);
    if (!label) continue;
    const qty = cellNum(hwSheet, "I", row);
    if (qty <= 0 || skipSensor(label)) continue;
    const sku = sensorSku(label);
    if (sku) {
      sensorSkuMap.set(sku, (sensorSkuMap.get(sku) ?? 0) + qty);
    } else {
      unmatchedSensors.push(`${qty}× ${label}`);
    }
  }

  // ── VF devices (cols K/N, rows 3-15, N = total qty) ──────────────────────
  // K = device label, N = total (shopfloor + admin)
  const vfDeviceMap   = new Map<string, { label: string; qty: number }>();
  for (let row = 3; row <= 15; row++) {
    const label = cellStr(hwSheet, "K", row);
    if (!label) continue;
    const qty = cellNum(hwSheet, "N", row);
    if (qty <= 0) continue;
    // Aggregate by label (some rows repeat the same device across size variants — keep separate)
    const key = label.toLowerCase().trim();
    const existing = vfDeviceMap.get(key);
    if (existing) {
      existing.qty += qty;
    } else {
      vfDeviceMap.set(key, { label, qty });
    }
  }

  // ── DB lookup ────────────────────────────────────────────────────────────
  const hwSkus = [...panelSkuMap.keys(), ...sensorSkuMap.keys()];

  const supabase = getServiceClient();
  const [hwResult, vfResult] = await Promise.all([
    hwSkus.length > 0
      ? supabase.from("products").select("id, sku, name, price_gbp_pence").in("sku", hwSkus).eq("active", true)
      : Promise.resolve({ data: [] as DbProduct[], error: null }),
    supabase.from("products").select("id, sku, name, price_gbp_pence").eq("category", "visual_factory").eq("active", true),
  ]);

  if (hwResult.error) {
    return NextResponse.json({ error: `DB error: ${hwResult.error.message}` }, { status: 500 });
  }

  const dbHw  = new Map((hwResult.data  ?? []).map((p) => [p.sku, p]));
  const vfProducts: DbProduct[] = vfResult.data ?? [];

  const items: ParsedItem[]       = [];
  const notInCatalogue: string[]  = [];

  for (const [sku, qty] of panelSkuMap) {
    const p = dbHw.get(sku);
    p ? items.push({ productId: p.id, sku: p.sku, name: p.name, qty, unitPricePence: p.price_gbp_pence })
      : notInCatalogue.push(sku);
  }
  for (const [sku, qty] of sensorSkuMap) {
    const p = dbHw.get(sku);
    p ? items.push({ productId: p.id, sku: p.sku, name: p.name, qty, unitPricePence: p.price_gbp_pence })
      : notInCatalogue.push(sku);
  }

  // Match VF devices
  const vfItems: ParsedItem[]          = [];
  const unmatchedDevices: string[]     = [];

  for (const { label, qty } of vfDeviceMap.values()) {
    const p = findVfProduct(label, vfProducts);
    if (!p) {
      // Only flag as unmatched if it's not a tablet (which we intentionally skip)
      if (!/ipad|tablet/i.test(label)) {
        unmatchedDevices.push(`${qty}× ${label}`);
      }
      continue;
    }
    const existing = vfItems.find((i) => i.productId === p.id);
    if (existing) {
      existing.qty += qty;
    } else {
      vfItems.push({ productId: p.id, sku: p.sku, name: p.name, qty, unitPricePence: p.price_gbp_pence });
    }
  }

  const result: ParseResult = {
    customerName,
    siteName,
    items,
    vfItems,
    unmatchedSensors,
    unmatchedDevices,
    notInCatalogue,
  };

  return NextResponse.json(result);
}
