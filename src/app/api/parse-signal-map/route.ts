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
  unmatchedSensors: string[];
  notInCatalogue: string[];
}

// ---------------------------------------------------------------------------
// SKU derivation helpers
// ---------------------------------------------------------------------------

function panelSku(inputCount: number, plcMaker: string, ssFlag: number): string {
  const size = inputCount <= 8 ? 8 : inputCount <= 16 ? 16 : 24;
  const makerLower = plcMaker.toLowerCase();
  let plc: string;
  if (makerLower.includes("siemens")) {
    plc = "SI";
  } else if (makerLower.includes("allen") || makerLower.includes("bradley")) {
    plc = "AB";
  } else {
    plc = "SI"; // fallback
  }
  const mat = ssFlag === 1 ? "SS" : "MS";
  return `AJS-${plc}-${mat}-${size}`;
}

function sensorSku(label: string): string | null {
  const lower = label.toLowerCase();
  if (lower.includes("lr-z") || lower.includes("laser")) return "AJS-LRZ-SENSOR";
  if (lower.includes("pz-v") || lower.includes("photoeye") || lower.includes("photo eye")) return "AJS-PZV-SENSOR";
  if (lower.includes("prox") || lower.includes("proximity")) return "AJS-4MM-SENSOR";
  if (lower.includes("relay")) return "AJS-RELAY";
  return null; // unmatched
}

function shouldSkipSensor(label: string): boolean {
  const lower = label.toLowerCase();
  return (
    lower.includes("customer sensor") ||
    lower.includes("push button") ||
    lower.includes("plc counter") ||
    lower.includes("totalizer") ||
    lower.includes("manual") ||
    lower.includes("no sensor")
  );
}

// ---------------------------------------------------------------------------
// Cell reader helpers
// ---------------------------------------------------------------------------

function cellStr(ws: XLSX.WorkSheet, col: string, row: number): string {
  const addr = `${col}${row}`;
  const cell = ws[addr];
  if (!cell) return "";
  return String(cell.v ?? "").trim();
}

function cellNum(ws: XLSX.WorkSheet, col: string, row: number): number {
  const addr = `${col}${row}`;
  const cell = ws[addr];
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
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  let workbook: XLSX.WorkBook;
  try {
    const arrayBuffer = await (file as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch (err) {
    return NextResponse.json(
      { error: `Could not read Excel file: ${err instanceof Error ? err.message : String(err)}` },
      { status: 422 }
    );
  }

  // ---------------------------------------------------------------------------
  // General sheet — B3 = customer name, B4 = site location
  // ---------------------------------------------------------------------------
  const generalSheet = workbook.Sheets["General"] ?? workbook.Sheets[workbook.SheetNames[0]];
  const customerName = generalSheet ? cellStr(generalSheet, "B", 3) : "";
  const siteName = generalSheet ? cellStr(generalSheet, "B", 4) : "";

  // ---------------------------------------------------------------------------
  // Hardware Summary sheet
  // ---------------------------------------------------------------------------
  const hwSheet = workbook.Sheets["Hardware Summary"];
  if (!hwSheet) {
    return NextResponse.json({ error: 'Sheet "Hardware Summary" not found in workbook' }, { status: 422 });
  }

  // Panel SKUs — rows 3-12, cols C (inputs), D (maker), E (SS flag)
  const panelSkuMap = new Map<string, number>(); // sku → qty
  for (let row = 3; row <= 12; row++) {
    const inputCount = cellNum(hwSheet, "C", row);
    if (inputCount <= 0) continue; // unused PLC slot
    const plcMaker = cellStr(hwSheet, "D", row);
    const ssFlag = cellNum(hwSheet, "E", row);
    const sku = panelSku(inputCount, plcMaker, ssFlag);
    panelSkuMap.set(sku, (panelSkuMap.get(sku) ?? 0) + 1);
  }

  // Sensor SKUs — rows 3-12, cols H (label), I (qty)
  const sensorSkuMap = new Map<string, number>(); // sku → qty
  const unmatchedSensors: string[] = [];
  for (let row = 3; row <= 12; row++) {
    const label = cellStr(hwSheet, "H", row);
    if (!label) continue;
    const qty = cellNum(hwSheet, "I", row);
    if (qty <= 0) continue;
    if (shouldSkipSensor(label)) continue;
    const sku = sensorSku(label);
    if (sku) {
      sensorSkuMap.set(sku, (sensorSkuMap.get(sku) ?? 0) + qty);
    } else {
      unmatchedSensors.push(`${qty}× ${label}`);
    }
  }

  // ---------------------------------------------------------------------------
  // DB lookup for all matched SKUs
  // ---------------------------------------------------------------------------
  const allSkus = [...panelSkuMap.keys(), ...sensorSkuMap.keys()];

  if (allSkus.length === 0) {
    const result: ParseResult = {
      customerName,
      siteName,
      items: [],
      unmatchedSensors,
      notInCatalogue: [],
    };
    return NextResponse.json(result);
  }

  const supabase = getServiceClient();
  const { data: productRows, error: prodError } = await supabase
    .from("products")
    .select("id, sku, name, price_gbp_pence")
    .in("sku", allSkus)
    .eq("active", true);

  if (prodError) {
    return NextResponse.json(
      { error: `Product lookup failed: ${prodError.message}` },
      { status: 500 }
    );
  }

  const dbMap = new Map<string, { id: string; sku: string; name: string; price_gbp_pence: number }>(
    (productRows ?? []).map((p) => [p.sku, p])
  );

  const items: ParsedItem[] = [];
  const notInCatalogue: string[] = [];

  for (const [sku, qty] of panelSkuMap.entries()) {
    const product = dbMap.get(sku);
    if (!product) {
      notInCatalogue.push(sku);
    } else {
      items.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        qty,
        unitPricePence: product.price_gbp_pence,
      });
    }
  }

  for (const [sku, qty] of sensorSkuMap.entries()) {
    const product = dbMap.get(sku);
    if (!product) {
      notInCatalogue.push(sku);
    } else {
      items.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        qty,
        unitPricePence: product.price_gbp_pence,
      });
    }
  }

  const result: ParseResult = {
    customerName,
    siteName,
    items,
    unmatchedSensors,
    notInCatalogue,
  };

  return NextResponse.json(result);
}
