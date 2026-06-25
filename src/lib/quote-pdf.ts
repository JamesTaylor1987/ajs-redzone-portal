/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { REDZONE_LOGO_B64 } from "./pdf-logos";
import { getLocale, getT } from "./i18n";

// ─── pdfmake Node.js singleton ────────────────────────────────────────────────
// Imported as CJS to avoid ESM/RSC conflicts that broke @react-pdf/renderer.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pm: any = require("pdfmake");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vfsFonts: Record<string, string> = require("pdfmake/build/vfs_fonts");

// One-time setup — runs once when this module is first imported.
(function initPdfMake() {
  Object.entries(vfsFonts).forEach(([name, data]) => {
    pm.virtualfs.writeFileSync(name, Buffer.from(data, "base64"));
  });
  pm.fonts = {
    Roboto: {
      normal: "Roboto-Regular.ttf",
      bold: "Roboto-Medium.ttf",
      italics: "Roboto-Italic.ttf",
      bolditalics: "Roboto-MediumItalic.ttf",
    },
  };
  pm.setUrlAccessPolicy((url: string) => url.startsWith("data:"));
  pm.setLocalAccessPolicy(() => false);
})();

// ─── Colours ──────────────────────────────────────────────────────────────────
const BLUE  = "#05618e";
const TEAL  = "#1886a1";
const LIGHT = "#e6ebed";
const MUTED = "#64748b";
const FAINT = "#f8fafc";
const HEADER_MUTED = "#8bbfd4"; // approx rgba(255,255,255,0.60) on BLUE bg

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PDFQuote {
  ref: string;
  contact_name: string;
  contact_email: string;
  contact_company?: string | null;
  contact_phone?: string | null;
  required_date?: string | null;
  install_requested?: boolean;
  site_name?: string | null;
  site_address_line1?: string | null;
  site_address_line2?: string | null;
  site_address_city?: string | null;
  site_address_postcode?: string | null;
  site_country?: string | null;
  subtotal_gbp_pence: number | string;
  shipping_gbp_pence?: number | null;
  shipping_pallets?: number | null;
  currency?: string | null;
  fx_rate_used?: number | null;
  locale?: string | null;
}

export interface PDFItem {
  sku: string;
  name: string;
  qty: number;
  line_total_gbp_pence: number | string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function money(gbpPence: number | string, currency = "GBP", fxRate: number | null = null): string {
  const p = Number(gbpPence);
  if (currency === "EUR" && fxRate && fxRate > 1) {
    return "€" + (p * fxRate / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return "£" + (p / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function today() {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

async function fetchLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch("https://ajsspalding.co.uk/img/ajs-logo@2x.png");
    const buf = await res.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

function addr(quote: PDFQuote): string {
  return [
    quote.site_address_line1, quote.site_address_line2,
    quote.site_address_city, quote.site_address_postcode, quote.site_country,
  ].filter(Boolean).join(", ");
}

// ─── Document sections ────────────────────────────────────────────────────────

function buildHeader(label: string, ref: string, date: string, logoKey: string | null, badge?: string, partnershipWith = "in partnership with"): Content {
  const ajsLogoContent: Content = logoKey
    ? { image: logoKey, width: 80, margin: [0, 0, 0, 0] } as any
    : { text: "AJS Control and Automation Ltd", bold: true, color: BLUE, fontSize: 11 };

  const refRow: Content[] = [
    { text: ref, bold: true, color: "#ffffff", fontSize: 22 } as any,
  ];
  if (badge) {
    refRow.push({
      text: badge,
      bold: true,
      fontSize: 7,
      color: "#166534",
      background: "#dcfce7",
      margin: [8, 6, 0, 0],
    } as any);
  }

  // White logo bar — AJS left, "in partnership with" + Redzone right
  const logoBar: Content = {
    table: {
      widths: ["*"],
      body: [[{
        columns: [
          ajsLogoContent,
          {
            columns: [
              { text: partnershipWith, color: MUTED, fontSize: 7, italics: true, alignment: "right" as const, margin: [0, 0, 8, 0] },
              { image: REDZONE_LOGO_B64, width: 72, margin: [0, 0, 0, 0] } as any,
            ],
            columnGap: 0,
            alignment: "right" as const,
          },
        ],
        verticalAlignment: "center",
      }]],
    },
    layout: {
      defaultBorder: false,
      fillColor: () => "#ffffff",
      paddingLeft: () => 36,
      paddingRight: () => 36,
      paddingTop: () => 14,
      paddingBottom: () => 14,
    },
  } as any;

  // Blue ref bar
  const refBar: Content = {
    table: {
      widths: ["*"],
      body: [[{
        stack: [
          { text: label.toUpperCase(), color: HEADER_MUTED, fontSize: 8, margin: [0, 0, 0, 4] },
          { columns: refRow },
          { text: date, color: HEADER_MUTED, fontSize: 8, margin: [0, 4, 0, 0] },
        ],
      }]],
    },
    layout: {
      defaultBorder: false,
      fillColor: () => BLUE,
      paddingLeft: () => 36,
      paddingRight: () => 36,
      paddingTop: () => 16,
      paddingBottom: () => 16,
    },
  } as any;

  return { stack: [logoBar, refBar] } as any;
}

function buildCustomerSection(quote: PDFQuote, t: ReturnType<typeof getT>): Content {
  const rows: Content[] = [];
  function row(label: string, value: string | null | undefined): void {
    if (!value) return;
    rows.push({ columns: [{ text: label, color: MUTED, width: 120 }, { text: value, bold: false }] } as any);
  }
  row(t("pdfCustomerName"), quote.contact_name);
  row(t("pdfCustomerCompany"), quote.contact_company);
  row(t("pdfCustomerEmail"), quote.contact_email);
  row(t("pdfCustomerPhone"), quote.contact_phone);
  const a = addr(quote);
  if (a) row(t("pdfCustomerDeliveryAddress"), a);
  if (quote.required_date) row(t("pdfCustomerRequiredBy"), fmtDate(quote.required_date));
  return {
    stack: [
      { text: t("pdfCustomerSection"), color: MUTED, bold: true, fontSize: 8, margin: [0, 0, 0, 6] },
      { stack: rows, fontSize: 10 },
    ],
    margin: [0, 0, 0, 14],
  } as any;
}

function buildItemsTable(quote: PDFQuote, items: PDFItem[], t: ReturnType<typeof getT>): Content {
  const ccy = quote.currency ?? "GBP";
  const fx  = quote.fx_rate_used ?? null;
  const total = items.reduce((sum, i) => sum + Number(i.line_total_gbp_pence), 0);

  const headerRow: any[] = [
    { text: t("pdfPartCode"), bold: true, color: MUTED, fontSize: 8, fillColor: FAINT },
    { text: t("pdfDescription"), bold: true, color: MUTED, fontSize: 8, fillColor: FAINT },
    { text: t("pdfQty"), bold: true, color: MUTED, fontSize: 8, alignment: "center", fillColor: FAINT },
    { text: t("pdfTotal"), bold: true, color: MUTED, fontSize: 8, alignment: "right", fillColor: FAINT },
  ];

  const dataRows: any[][] = items.map((item) => [
    { text: item.sku, color: "#94a3b8", fontSize: 9 },
    { text: item.name },
    { text: String(item.qty), alignment: "center" },
    { text: money(item.line_total_gbp_pence, ccy, fx), alignment: "right" },
  ]);

  const shippingPence = quote.shipping_gbp_pence ? Number(quote.shipping_gbp_pence) : null;
  const pallets = quote.shipping_pallets ?? 1;
  const grandTotal = total + (shippingPence ?? 0);
  const shippingLabel = t(pallets !== 1 ? "pdfShippingPallets" : "pdfShippingPallet", { count: pallets });

  const subtotalRow: any[] = [
    { text: t("pdfSubtotalExVat"), colSpan: 3, alignment: "right", border: [false, true, false, false] },
    {}, {},
    { text: money(total, ccy, fx), alignment: "right", border: [false, true, false, false] },
  ];

  const shippingRow: any[] = shippingPence !== null ? [
    { text: shippingLabel, colSpan: 3, alignment: "right", border: [false, false, false, false] },
    {}, {},
    { text: money(shippingPence, ccy, fx), alignment: "right", border: [false, false, false, false] },
  ] : [
    { text: shippingLabel, colSpan: 3, alignment: "right", border: [false, false, false, false] },
    {}, {},
    { text: "EXW", alignment: "right", color: MUTED, border: [false, false, false, false] },
  ];

  const grandTotalRow: any[] = [
    { text: t("pdfTotalExVat"), colSpan: 3, bold: true, alignment: "right", border: [false, true, false, false] },
    {}, {},
    { text: money(grandTotal, ccy, fx), bold: true, color: BLUE, fontSize: 11, alignment: "right", border: [false, true, false, false] },
  ];

  const tableBody = [headerRow, ...dataRows, subtotalRow, shippingRow, grandTotalRow];

  const sections: Content[] = [
    { text: t("pdfItemsSection"), color: MUTED, bold: true, fontSize: 8, margin: [0, 0, 0, 6] } as any,
    {
      table: {
        widths: [72, "*", 28, 68],
        headerRows: 1,
        body: tableBody,
      },
      layout: {
        defaultBorder: false,
        hLineColor: () => LIGHT,
        hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length ? 0 : 0.5),
        vLineWidth: () => 0,
        paddingTop: () => 5,
        paddingBottom: () => 5,
        paddingLeft: () => 4,
        paddingRight: () => 4,
      },
    } as any,
  ];

  return { stack: sections } as any;
}

function buildNoticeBox(text: string, bg: string, color: string, heading?: string): Content {
  return {
    table: {
      widths: ["*"],
      body: [[{
        stack: [
          ...(heading ? [{ text: heading, bold: true, color, fontSize: 9, margin: [0, 0, 0, 3] }] : []),
          { text, color, fontSize: 9, lineHeight: 1.5 },
        ],
      }]],
    },
    layout: {
      defaultBorder: false,
      fillColor: () => bg,
      paddingLeft: () => 12,
      paddingRight: () => 12,
      paddingTop: () => 10,
      paddingBottom: () => 10,
    },
    margin: [0, 14, 0, 0],
  } as any;
}

function buildTerms(t: ReturnType<typeof getT>): Content {
  return {
    text: t("pdfTermsText"),
    color: "#94a3b8",
    fontSize: 8,
    lineHeight: 1.5,
    margin: [0, 14, 0, 0],
  } as any;
}

function buildDivider(): Content {
  return { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: LIGHT }], margin: [0, 14, 0, 14] } as any;
}

function buildFooter(ref: string): (page: number, pages: number) => Content {
  return (page, pages) => ({
    text: `${ref}  ·  Page ${page} of ${pages}  ·  AJS Control and Automation Ltd  ·  rz@ajsspalding.co.uk  ·  01406 424954`,
    color: "#94a3b8",
    fontSize: 7,
    alignment: "center",
    margin: [36, 8, 36, 0],
  });
}

// ─── Installation quote types ────────────────────────────────────────────────

export interface InstallPDFQuote {
  ref: string;
  hardware_ref: string | null;
  customer_name: string;
  customer_email: string;
  company_name?: string | null;
  site_name?: string | null;
  site_address_line1?: string | null;
  site_address_line2?: string | null;
  site_address_city?: string | null;
  site_address_postcode?: string | null;
  site_country?: string | null;
  required_date?: string | null;
  budget_from_pence: number;
  budget_to_pence: number;
  ajs_notes?: string | null;
  containment_notes?: string | null;
  payment_terms?: string | null;
  exclusions?: string | null;
  locale?: string | null;
  currency?: string | null;
  fx_rate?: number | null;
  travel_method?: string | null;
  include_vf?: boolean;
  staying_away?: boolean;
}

export interface InstallPDFItem {
  sku: string;
  name: string;
  qty: number;
}

// ─── Render helper ─────────────────────────────────────────────────────────────
function renderDoc(def: TDocumentDefinitions): Promise<Buffer> {
  return pm.createPdf(def).getBuffer() as Promise<Buffer>;
}

// ─── Documents ────────────────────────────────────────────────────────────────
export async function renderQuoteRequestPDF(quote: PDFQuote, items: PDFItem[]): Promise<Buffer> {
  const t = getT(getLocale(quote.locale));
  const logoSrc = await fetchLogoBase64();
  const images = logoSrc ? { logo: logoSrc } : undefined;

  const def: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [0, 0, 0, 50],
    ...(images && { images }),
    content: [
      buildHeader(t("pdfQuoteRequest"), quote.ref, today(), logoSrc ? "logo" : null, undefined, t("pdfInPartnershipWith")),
      {
        stack: [
          buildCustomerSection(quote, t),
          buildDivider(),
          buildItemsTable(quote, items, t),
          buildNoticeBox(t("pdfQuoteNoticeText"), "#eff6ff", "#1e40af"),
          buildTerms(t),
        ],
        margin: [36, 24, 36, 0],
      } as any,
    ],
    footer: buildFooter(quote.ref),
    defaultStyle: { font: "Roboto", fontSize: 10, color: "#1e293b" },
  } as any;

  return renderDoc(def);
}

export async function renderOrderConfirmationPDF(quote: PDFQuote, items: PDFItem[]): Promise<Buffer> {
  const t = getT(getLocale(quote.locale));
  const logoSrc = await fetchLogoBase64();
  const images = logoSrc ? { logo: logoSrc } : undefined;

  const def: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [0, 0, 0, 50],
    ...(images && { images }),
    content: [
      buildHeader(
        t("pdfOrderConfirmation"),
        quote.ref,
        t("pdfConfirmedDate", { date: today() }),
        logoSrc ? "logo" : null,
        t("pdfOrderConfirmedBadge"),
        t("pdfInPartnershipWith"),
      ),
      {
        stack: [
          buildCustomerSection(quote, t),
          buildDivider(),
          buildItemsTable(quote, items, t),
          buildNoticeBox(t("pdfOrderNoticeText"), "#f0fdf4", "#166534", t("pdfOrderNoticeHeading")),
          buildTerms(t),
        ],
        margin: [36, 24, 36, 0],
      } as any,
    ],
    footer: buildFooter(quote.ref),
    defaultStyle: { font: "Roboto", fontSize: 10, color: "#1e293b" },
  } as any;

  return renderDoc(def);
}

export async function renderWorkOrderPDF(quote: PDFQuote, items: PDFItem[]): Promise<Buffer> {
  const logoSrc = await fetchLogoBase64();
  const images = logoSrc ? { logo: logoSrc } : undefined;
  const requiredDate = quote.required_date ? fmtDate(quote.required_date) : "NOT SPECIFIED";
  const delivery = addr(quote);

  const partsRows: any[][] = items.map((item) => [
    { text: item.sku, bold: true, fontSize: 11, color: "#1e293b" },
    { text: item.name, fontSize: 10 },
    { text: String(item.qty), bold: true, fontSize: 14, color: BLUE, alignment: "center" },
  ]);

  const sp = quote.shipping_gbp_pence != null ? Number(quote.shipping_gbp_pence) : null;
  const ccy = quote.currency ?? "GBP";
  const fx  = quote.fx_rate_used ?? null;
  const pallets = quote.shipping_pallets ?? null;
  const shippingLabel = pallets ? `${pallets} pallet${pallets !== 1 ? "s" : ""}` : "";
  const shippingValue = sp !== null ? `${money(sp, ccy, fx)}${shippingLabel ? ` — ${shippingLabel}` : ""}` : `EXW (customer arranges)${shippingLabel ? ` — ${shippingLabel}` : ""}`;

  const def: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [0, 0, 0, 50],
    ...(images && { images }),
    content: [
      buildHeader("Work order", quote.ref, today(), logoSrc ? "logo" : null),
      // Yellow date banner
      {
        table: {
          widths: ["*"],
          body: [[{
            stack: [
              { text: "REQUIRED DELIVERY DATE", bold: true, color: "#854d0e", fontSize: 8, margin: [0, 0, 0, 3] },
              { text: requiredDate, bold: true, fontSize: 20, color: "#1e293b" },
            ],
          }]],
        },
        layout: {
          defaultBorder: false,
          fillColor: () => "#fef9c3",
          hLineWidth: (i: number, node: any) => (i === node.table.body.length ? 3 : 0),
          hLineColor: () => "#eab308",
          paddingLeft: () => 36,
          paddingRight: () => 36,
          paddingTop: () => 12,
          paddingBottom: () => 12,
        },
      } as any,
      {
        stack: [
          // Customer & delivery
          {
            stack: [
              { text: "CUSTOMER & DELIVERY", color: MUTED, bold: true, fontSize: 8, margin: [0, 0, 0, 6] },
              {
                columns: [
                  { text: "Customer", color: MUTED, width: 120 },
                  { text: `${quote.contact_name}${quote.contact_company ? ` — ${quote.contact_company}` : ""}`, bold: true },
                ],
              },
              ...(quote.contact_phone ? [{
                columns: [
                  { text: "Phone", color: MUTED, width: 120 },
                  { text: quote.contact_phone },
                ],
              }] : []),
              ...(quote.site_name ? [{
                columns: [
                  { text: "Site", color: MUTED, width: 120 },
                  { text: quote.site_name, bold: true },
                ],
              }] : []),
              ...(delivery ? [{
                columns: [
                  { text: "Delivery address", color: MUTED, width: 120 },
                  { text: delivery, bold: true },
                ],
              }] : []),
            ],
            fontSize: 10,
            margin: [0, 0, 0, 14],
          } as any,
          buildDivider(),
          // Parts list — NO prices
          { text: "PARTS TO BUILD / SHIP", color: MUTED, bold: true, fontSize: 8, margin: [0, 0, 0, 6] } as any,
          {
            table: {
              widths: [90, "*", 44],
              headerRows: 1,
              body: [
                [
                  { text: "Part code", bold: true, color: MUTED, fontSize: 8, fillColor: FAINT },
                  { text: "Description", bold: true, color: MUTED, fontSize: 8, fillColor: FAINT },
                  { text: "Qty", bold: true, color: MUTED, fontSize: 8, alignment: "center", fillColor: FAINT },
                ],
                ...partsRows,
              ],
            },
            layout: {
              defaultBorder: false,
              hLineColor: () => LIGHT,
              hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length ? 0 : 0.5),
              vLineWidth: () => 0,
              paddingTop: () => 6,
              paddingBottom: () => 6,
              paddingLeft: () => 4,
              paddingRight: () => 4,
            },
          } as any,
          buildNoticeBox(shippingValue, "#f8fafc", "#1e293b", "SHIPPING"),
          ...(quote.install_requested ? [
            buildNoticeBox(
              "Installation requested — separate installation quote in progress. See portal for details.",
              "#fff7ed",
              "#9a3412",
            ),
          ] : []),
          {
            text: `Generated by AJS Redzone Portal · ${quote.ref}`,
            color: "#94a3b8",
            fontSize: 8,
            margin: [0, 24, 0, 0],
          } as any,
        ],
        margin: [36, 24, 36, 0],
      } as any,
    ],
    footer: buildFooter(quote.ref),
    defaultStyle: { font: "Roboto", fontSize: 10, color: "#1e293b" },
  } as any;

  return renderDoc(def);
}

const DEFAULT_PAYMENT_TERMS =
  "50% upon order placement\n25% upon receipt of hardware\n15% upon completion of installation\n10% upon confirmation that Redzone counts are good";

function buildInstallIntro(): Content {
  return {
    text: "AJS Control and Automation Ltd are an official Redzone QAD installation partner. With over 500 successful implementations delivered in the last five years, and with all hardware components held in stock, we provide a seamless, expert-led installation from day one.",
    fontSize: 10,
    color: "#475569",
    lineHeight: 1.6,
    margin: [0, 0, 0, 14],
  } as any;
}

function buildScopeOfWorks(
  t: ReturnType<typeof getT>,
  travelMethod?: string | null,
  stayingAway?: boolean,
): Content {
  function scopeSection(title: string, bullets: string[]): any {
    return {
      stack: [
        { text: title, bold: true, color: TEAL, fontSize: 9, margin: [0, 0, 0, 3] },
        { ul: bullets, fontSize: 9, color: "#475569", lineHeight: 1.4, margin: [0, 0, 0, 10] },
      ],
    };
  }

  const travelBullets: string[] = ["Engineers’ travel time"];
  if (travelMethod === "drive") {
    travelBullets.push("Mileage costs");
  } else if (travelMethod === "eurotunnel") {
    travelBullets.push("Mileage to tunnel costs", "Eurotunnel crossing");
  } else if (travelMethod === "fly") {
    travelBullets.push("Flight costs");
  } else {
    travelBullets.push("Mileage or flight costs", "Ferry and Eurotunnel crossings");
  }
  if (stayingAway !== false) travelBullets.push("Hotel and stop out", "Subsistence");

  return {
    stack: [
      { text: t("pdfInstallScopeSection"), color: MUTED, bold: true, fontSize: 8, margin: [0, 0, 0, 10] } as any,
      scopeSection("Project Management", [
        "Travel and accommodation arrangements",
        "Health & Safety documentation (RAMS)",
        "Project documentation, scheduling and labour planning",
      ]),
      scopeSection("Travel", travelBullets),
      scopeSection("Site Works", [
        "Mounting of PLC control panels",
        "Mounting of sensor brackets and fitting sensors",
        "Routing and connection of sensor cabling",
        "Installation of cable identification tags",
      ]),
      scopeSection("Commissioning", [
        "Validation of Redzone signal mapping",
        "Testing of all sensor inputs and counts",
        "OPC communications configuration",
        "Software loading and testing",
        "Remote support with Redzone during sign-off",
      ]),
    ],
  } as any;
}

export const DEFAULT_INSTALL_EXCLUSIONS =
  "Mains power supply to control panels (230v, 10 amp)\n" +
  "Network connectivity to control panels\n" +
  "Supply, installation and fixing of TVs and tablets\n" +
  "Out of hours working\n" +
  "Access equipment beyond standard step ladders";

function buildExclusions(exclusionsText: string, t: ReturnType<typeof getT>): Content {
  const lines = exclusionsText.split("\n").map((l) => l.trim()).filter(Boolean);
  return {
    stack: [
      { text: t("pdfInstallExclusionsSection"), color: MUTED, bold: true, fontSize: 8, margin: [0, 0, 0, 6] },
      { text: "Unless otherwise stated, the following are excluded from this quotation:", fontSize: 9, color: MUTED, margin: [0, 0, 0, 6] },
      { ul: lines, fontSize: 9, color: "#475569", lineHeight: 1.4 },
    ],
    margin: [0, 14, 0, 0],
  } as any;
}

function buildPaymentTerms(terms: string, t: ReturnType<typeof getT>): Content {
  const lines = terms.split("\n").map((l) => l.trim()).filter(Boolean);
  return {
    stack: [
      { text: t("pdfInstallPaymentTermsSection"), color: MUTED, bold: true, fontSize: 8, margin: [0, 0, 0, 6] },
      { ul: lines, fontSize: 9, color: "#475569", lineHeight: 1.4 },
    ],
    margin: [0, 14, 0, 0],
  } as any;
}

export async function renderInstallationQuotePDF(
  quote: InstallPDFQuote,
  items: InstallPDFItem[],
): Promise<Buffer> {
  const t = getT(getLocale(quote.locale));
  const logoSrc = await fetchLogoBase64();
  const images = logoSrc ? { logo: logoSrc } : undefined;

  const isEur = quote.currency === "EUR" && quote.fx_rate && quote.fx_rate > 1;
  const fmtBudget = (p: number) => isEur
    ? "€" + (p * (quote.fx_rate ?? 1) / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : "£" + (p / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const gbpRound = fmtBudget;

  const addrStr = [
    quote.site_address_line1, quote.site_address_line2,
    quote.site_address_city, quote.site_address_postcode, quote.site_country,
  ].filter(Boolean).join(", ");

  function drow(label: string, value: string | null | undefined): any {
    if (!value) return null;
    return { columns: [{ text: label, color: MUTED, width: 120 }, { text: value }], fontSize: 10, margin: [0, 0, 0, 3] };
  }

  const customerRows = [
    drow(t("pdfCustomerName"), quote.customer_name),
    drow(t("pdfCustomerCompany"), quote.company_name),
    drow(t("pdfCustomerEmail"), quote.customer_email),
    drow(t("pdfInstallSite"), quote.site_name),
    drow(t("pdfInstallAddress"), addrStr || null),
    quote.required_date ? drow(t("pdfCustomerRequiredBy"), fmtDate(quote.required_date)) : null,
  ].filter(Boolean);

  const installItemRows: any[][] = items.map((i) => [
    { text: i.sku, color: "#94a3b8", fontSize: 9 },
    { text: i.name },
    { text: String(i.qty), alignment: "center" },
  ]);

  const paymentTerms = (quote.payment_terms ?? "").trim() || DEFAULT_PAYMENT_TERMS;

  const def: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [0, 0, 0, 50],
    ...(images && { images }),
    content: [
      buildHeader(t("pdfInstallationBudgetEstimate"), quote.ref, today(), logoSrc ? "logo" : null, undefined, t("pdfInPartnershipWith")),
      {
        stack: [
          buildInstallIntro(),
          {
            stack: [
              { text: t("pdfInstallCustomerSite"), color: MUTED, bold: true, fontSize: 8, margin: [0, 0, 0, 6] },
              ...customerRows,
            ],
            margin: [0, 0, 0, 14],
          } as any,
          buildDivider(),
          ...(items.length > 0 ? [
            {
              stack: [
                { text: t("pdfInstallHardwareSection"), color: MUTED, bold: true, fontSize: 8, margin: [0, 0, 0, 3] },
                {
                  text: quote.hardware_ref
                    ? t("pdfInstallHardwareSupplied", { ref: quote.hardware_ref })
                    : t("pdfInstallHardwareNote"),
                  fontSize: 8,
                  color: MUTED,
                  italics: true,
                  margin: [0, 0, 0, 8],
                },
              ],
            } as any,
            {
              table: {
                widths: [72, "*", 28],
                headerRows: 1,
                body: [
                  [
                    { text: t("pdfPartCode"), bold: true, color: MUTED, fontSize: 8, fillColor: FAINT },
                    { text: t("pdfDescription"), bold: true, color: MUTED, fontSize: 8, fillColor: FAINT },
                    { text: t("pdfQty"), bold: true, color: MUTED, fontSize: 8, alignment: "center", fillColor: FAINT },
                  ],
                  ...installItemRows,
                ],
              },
              layout: {
                defaultBorder: false,
                hLineColor: () => LIGHT,
                hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length ? 0 : 0.5),
                vLineWidth: () => 0,
                paddingTop: () => 5,
                paddingBottom: () => 5,
                paddingLeft: () => 4,
                paddingRight: () => 4,
              },
              margin: [0, 0, 0, 14],
            } as any,
            buildDivider(),
          ] : []),
          buildScopeOfWorks(t, quote.travel_method, quote.staying_away),
          buildDivider(),
          {
            table: {
              widths: ["*"],
              body: [[{
                stack: [
                  { text: quote.budget_from_pence >= quote.budget_to_pence ? t("pdfInstallFixedPriceBox") : t("pdfInstallBudgetBox"), bold: true, color: HEADER_MUTED, fontSize: 8, margin: [0, 0, 0, 8] },
                  { text: quote.budget_from_pence >= quote.budget_to_pence ? fmtBudget(quote.budget_from_pence) : `${fmtBudget(quote.budget_from_pence)} – ${fmtBudget(quote.budget_to_pence)}`, bold: true, color: "#ffffff", fontSize: 28 },
                ],
              }]],
            },
            layout: {
              defaultBorder: false,
              fillColor: () => BLUE,
              paddingLeft: () => 24,
              paddingRight: () => 24,
              paddingTop: () => 20,
              paddingBottom: () => 20,
            },
          } as any,
          ...(quote.containment_notes ? [buildNoticeBox(quote.containment_notes, "#f0fdf4", "#166534", "CONTAINMENT")] : []),
          ...(quote.ajs_notes ? [buildNoticeBox(quote.ajs_notes, FAINT, "#1e293b", "NOTES FROM AJS REDZONE")] : []),
          buildExclusions(quote.exclusions ?? DEFAULT_INSTALL_EXCLUSIONS, t),
          buildPaymentTerms(paymentTerms, t),
          {
            text: `${t("pdfInstallFooterText")}\nAJS Control and Automation Ltd  ·  rz@ajsspalding.co.uk  ·  01406 424954`,
            color: "#94a3b8",
            fontSize: 8,
            lineHeight: 1.5,
            margin: [0, 14, 0, 0],
          } as any,
        ],
        margin: [36, 24, 36, 0],
      } as any,
    ],
    footer: buildFooter(quote.ref),
    defaultStyle: { font: "Roboto", fontSize: 10, color: "#1e293b" },
  } as any;

  return renderDoc(def);
}
