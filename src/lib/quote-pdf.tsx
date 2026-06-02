import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

// ─── Colours ─────────────────────────────────────────────────────────────────
const BLUE  = "#05618e";
const TEAL  = "#1886a1";
const LIGHT = "#e6ebed";
const MUTED = "#64748b";
const FAINT = "#f8fafc";

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:          { paddingTop: 0, paddingBottom: 50, paddingHorizontal: 0, fontFamily: "Helvetica", fontSize: 10, color: "#1e293b" },
  headerBar:     { backgroundColor: BLUE, paddingTop: 20, paddingBottom: 20, paddingHorizontal: 36 },
  headerLabel:   { fontSize: 9, color: "rgba(255,255,255,0.65)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 },
  headerRef:     { fontSize: 24, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  headerDate:    { fontSize: 9, color: "rgba(255,255,255,0.65)", marginTop: 4 },
  logoRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  ajsLogo:       { height: 22, width: 80, objectFit: "contain" },
  rzLabel:       { fontSize: 10, fontFamily: "Helvetica-Bold", color: TEAL },
  body:          { paddingHorizontal: 36, paddingTop: 24 },
  divider:       { borderBottomWidth: 1, borderBottomColor: LIGHT, borderBottomStyle: "solid", marginTop: 16, marginBottom: 16 },
  sectionLabel:  { fontSize: 8, fontFamily: "Helvetica-Bold", color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  dl:            { marginBottom: 14 },
  dlRow:         { flexDirection: "row", marginBottom: 3 },
  dlKey:         { width: 120, color: MUTED, fontSize: 10 },
  dlVal:         { flex: 1, fontSize: 10 },
  thRow:         { flexDirection: "row", backgroundColor: FAINT, borderBottomWidth: 1, borderBottomColor: LIGHT, borderBottomStyle: "solid", paddingTop: 5, paddingBottom: 5, paddingHorizontal: 6 },
  tdRow:         { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: FAINT, borderBottomStyle: "solid", paddingTop: 5, paddingBottom: 5, paddingHorizontal: 6 },
  colSku:        { width: 80, fontSize: 9, color: "#94a3b8" },
  colName:       { flex: 1, fontSize: 10 },
  colQty:        { width: 30, textAlign: "center", fontSize: 10 },
  colAmt:        { width: 70, textAlign: "right", fontSize: 10 },
  bold:          { fontFamily: "Helvetica-Bold" },
  totalRow:      { flexDirection: "row", justifyContent: "flex-end", paddingTop: 8, paddingHorizontal: 6 },
  noticeBox:     { borderRadius: 4, paddingTop: 10, paddingBottom: 10, paddingHorizontal: 12, marginTop: 16 },
  noticeText:    { fontSize: 9, lineHeight: 1.5 },
  terms:         { marginTop: 16, fontSize: 8, color: "#94a3b8", lineHeight: 1.5 },
  footer:        { position: "absolute", bottom: 20, left: 36, right: 36, fontSize: 8, color: "#94a3b8", textAlign: "center", borderTopWidth: 1, borderTopColor: LIGHT, borderTopStyle: "solid", paddingTop: 8 },
  badge:         { borderRadius: 3, paddingTop: 2, paddingBottom: 2, paddingHorizontal: 6, marginLeft: 8 },
  // Work order extras
  woDateBanner:  { backgroundColor: "#fef9c3", borderBottomWidth: 3, borderBottomColor: "#eab308", borderBottomStyle: "solid", paddingTop: 12, paddingBottom: 12, paddingHorizontal: 36 },
  woDateLabel:   { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#854d0e", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 },
  woDateVal:     { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#1e293b" },
  woColSku:      { width: 90, fontFamily: "Helvetica-Bold", fontSize: 11, color: "#1e293b" },
  woColName:     { flex: 1, fontSize: 10 },
  woColQty:      { width: 44, textAlign: "center", fontFamily: "Helvetica-Bold", fontSize: 16, color: BLUE },
});

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PDFQuote {
  ref: string;
  contact_name: string;
  contact_email: string;
  contact_company?: string | null;
  contact_phone?: string | null;
  required_date?: string | null;
  install_requested?: boolean;
  site_address_line1?: string | null;
  site_address_line2?: string | null;
  site_address_city?: string | null;
  site_address_postcode?: string | null;
  site_country?: string | null;
  subtotal_gbp_pence: number | string;
  currency?: string | null;
  fx_rate_used?: number | null;
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

// ─── Shared components ────────────────────────────────────────────────────────
function Header({ label, ref: quoteRef, date, logoSrc, badge }: {
  label: string; ref: string; date: string; logoSrc: string | null; badge?: React.ReactNode;
}) {
  return (
    <View style={s.headerBar}>
      <View style={s.logoRow}>
        {logoSrc
          ? <Image src={logoSrc} style={s.ajsLogo} />
          : <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#ffffff" }}>AJS Control &amp; Automation</Text>
        }
        <Text style={s.rzLabel}>Redzone Hardware Portal</Text>
      </View>
      <Text style={s.headerLabel}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={s.headerRef}>{quoteRef}</Text>
        {badge}
      </View>
      <Text style={s.headerDate}>{date}</Text>
    </View>
  );
}

function CustomerSection({ quote }: { quote: PDFQuote }) {
  const addr = [
    quote.site_address_line1, quote.site_address_line2,
    quote.site_address_city, quote.site_address_postcode, quote.site_country,
  ].filter(Boolean);

  return (
    <View style={s.dl}>
      <Text style={s.sectionLabel}>Customer</Text>
      <View style={s.dlRow}><Text style={s.dlKey}>Name</Text><Text style={s.dlVal}>{quote.contact_name}</Text></View>
      {!!quote.contact_company && <View style={s.dlRow}><Text style={s.dlKey}>Company</Text><Text style={s.dlVal}>{quote.contact_company}</Text></View>}
      <View style={s.dlRow}><Text style={s.dlKey}>Email</Text><Text style={s.dlVal}>{quote.contact_email}</Text></View>
      {!!quote.contact_phone && <View style={s.dlRow}><Text style={s.dlKey}>Phone</Text><Text style={s.dlVal}>{quote.contact_phone}</Text></View>}
      {!!quote.required_date && <View style={s.dlRow}><Text style={s.dlKey}>Required by</Text><Text style={s.dlVal}>{fmtDate(quote.required_date)}</Text></View>}
      {addr.length > 0 && <View style={s.dlRow}><Text style={s.dlKey}>Delivery address</Text><Text style={s.dlVal}>{addr.join(", ")}</Text></View>}
    </View>
  );
}

function ItemsTable({ quote, items }: { quote: PDFQuote; items: PDFItem[] }) {
  const ccy = quote.currency ?? "GBP";
  const fx  = quote.fx_rate_used ?? null;
  const total = items.reduce((sum, i) => sum + Number(i.line_total_gbp_pence), 0);

  return (
    <View>
      <Text style={s.sectionLabel}>Items</Text>
      <View style={s.thRow}>
        <Text style={[s.colSku, s.bold]}>Part code</Text>
        <Text style={[s.colName, s.bold]}>Description</Text>
        <Text style={[s.colQty, s.bold]}>Qty</Text>
        <Text style={[s.colAmt, s.bold]}>Total</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={s.tdRow}>
          <Text style={s.colSku}>{item.sku}</Text>
          <Text style={s.colName}>{item.name}</Text>
          <Text style={s.colQty}>{item.qty}</Text>
          <Text style={s.colAmt}>{money(item.line_total_gbp_pence, ccy, fx)}</Text>
        </View>
      ))}
      <View style={s.totalRow}>
        <Text style={[s.bold, { marginRight: 8 }]}>Subtotal (ex-VAT)</Text>
        <Text style={[s.bold, s.colAmt, { color: BLUE, fontSize: 11 }]}>{money(total, ccy, fx)}</Text>
      </View>
      {ccy === "EUR" && (
        <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 6, marginTop: 2 }}>
          <Text style={{ fontSize: 8, color: "#94a3b8" }}>Indicative EUR rate — invoice issued in GBP</Text>
        </View>
      )}
    </View>
  );
}

function Footer({ quoteRef }: { quoteRef: string }) {
  return (
    <Text
      style={s.footer}
      render={({ pageNumber, totalPages }) =>
        `${quoteRef}  ·  Page ${pageNumber} of ${totalPages}  ·  AJS Spalding Ltd  ·  rz@ajsspalding.co.uk  ·  01406 424954`
      }
      fixed
    />
  );
}

// ─── Documents ────────────────────────────────────────────────────────────────
function QuoteRequestDocument({ quote, items, logoSrc }: { quote: PDFQuote; items: PDFItem[]; logoSrc: string | null }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header label="Quote request" ref={quote.ref} date={today()} logoSrc={logoSrc} />
        <View style={s.body}>
          <CustomerSection quote={quote} />
          <View style={s.divider} />
          <ItemsTable quote={quote} items={items} />
          <View style={[s.noticeBox, { backgroundColor: "#eff6ff" }]}>
            <Text style={[s.noticeText, { color: "#1e40af" }]}>
              This confirms receipt of your quote request. Prices are indicative and subject to confirmation by the AJS Redzone team. You will receive your priced quote by email shortly.
            </Text>
          </View>
          <Text style={s.terms}>
            All prices ex-VAT. VAT applied on invoice based on registration status.{"\n"}
            Hardware invoiced 100% prior to shipment. DAP delivery terms.
          </Text>
        </View>
        <Footer quoteRef={quote.ref} />
      </Page>
    </Document>
  );
}

function OrderConfirmationDocument({ quote, items, logoSrc }: { quote: PDFQuote; items: PDFItem[]; logoSrc: string | null }) {
  const badge = (
    <View style={[s.badge, { backgroundColor: "#dcfce7" }]}>
      <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#166534" }}>ORDER CONFIRMED</Text>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header label="Order confirmation" ref={quote.ref} date={`Confirmed ${today()}`} logoSrc={logoSrc} badge={badge} />
        <View style={s.body}>
          <CustomerSection quote={quote} />
          <View style={s.divider} />
          <ItemsTable quote={quote} items={items} />
          <View style={[s.noticeBox, { backgroundColor: "#f0fdf4" }]}>
            <Text style={[s.noticeText, { fontFamily: "Helvetica-Bold", color: "#166534", marginBottom: 3 }]}>What happens next</Text>
            <Text style={[s.noticeText, { color: "#166534" }]}>
              An invoice will be issued within 24 hours, payable 100% prior to shipment. Once payment is received your order moves into production. You will receive automated updates at each stage.
            </Text>
          </View>
          <Text style={s.terms}>
            All prices ex-VAT. VAT applied on invoice based on registration status.{"\n"}
            Hardware invoiced 100% prior to shipment. DAP delivery terms.
          </Text>
        </View>
        <Footer quoteRef={quote.ref} />
      </Page>
    </Document>
  );
}

function WorkOrderDocument({ quote, items, logoSrc }: { quote: PDFQuote; items: PDFItem[]; logoSrc: string | null }) {
  const requiredDate = quote.required_date ? fmtDate(quote.required_date) : "NOT SPECIFIED";
  const addr = [
    quote.site_address_line1, quote.site_address_line2,
    quote.site_address_city, quote.site_address_postcode, quote.site_country,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header label="Work order" ref={quote.ref} date={today()} logoSrc={logoSrc} />
        <View style={s.woDateBanner}>
          <Text style={s.woDateLabel}>Required delivery date</Text>
          <Text style={s.woDateVal}>{requiredDate}</Text>
        </View>
        <View style={s.body}>
          {/* Customer & delivery */}
          <View style={s.dl}>
            <Text style={s.sectionLabel}>Customer &amp; delivery</Text>
            <View style={s.dlRow}>
              <Text style={s.dlKey}>Customer</Text>
              <Text style={[s.dlVal, s.bold]}>
                {quote.contact_name}{quote.contact_company ? ` — ${quote.contact_company}` : ""}
              </Text>
            </View>
            {!!quote.contact_phone && <View style={s.dlRow}><Text style={s.dlKey}>Phone</Text><Text style={s.dlVal}>{quote.contact_phone}</Text></View>}
            {addr.length > 0 && <View style={s.dlRow}><Text style={s.dlKey}>Delivery address</Text><Text style={[s.dlVal, s.bold]}>{addr.join(", ")}</Text></View>}
          </View>
          <View style={s.divider} />
          {/* Parts — NO prices */}
          <View>
            <Text style={s.sectionLabel}>Parts to build / ship</Text>
            <View style={s.thRow}>
              <Text style={[s.woColSku, s.bold]}>Part code</Text>
              <Text style={[s.woColName, s.bold]}>Description</Text>
              <Text style={[s.woColQty, s.bold]}>Qty</Text>
            </View>
            {items.map((item, i) => (
              <View key={i} style={s.tdRow}>
                <Text style={s.woColSku}>{item.sku}</Text>
                <Text style={s.woColName}>{item.name}</Text>
                <Text style={s.woColQty}>{item.qty}</Text>
              </View>
            ))}
          </View>
          {!!quote.install_requested && (
            <View style={[s.noticeBox, { backgroundColor: "#fff7ed", marginTop: 16 }]}>
              <Text style={[s.noticeText, { fontFamily: "Helvetica-Bold", color: "#9a3412" }]}>
                Installation requested — separate installation quote in progress. See portal for details.
              </Text>
            </View>
          )}
          <Text style={[s.terms, { marginTop: 24 }]}>
            Generated by AJS Redzone Portal · {quote.ref}
          </Text>
        </View>
        <Footer quoteRef={quote.ref} />
      </Page>
    </Document>
  );
}

// ─── Public render functions ───────────────────────────────────────────────────
export async function renderQuoteRequestPDF(quote: PDFQuote, items: PDFItem[]): Promise<Buffer> {
  const logoSrc = await fetchLogoBase64();
  return renderToBuffer(<QuoteRequestDocument quote={quote} items={items} logoSrc={logoSrc} />);
}

export async function renderOrderConfirmationPDF(quote: PDFQuote, items: PDFItem[]): Promise<Buffer> {
  const logoSrc = await fetchLogoBase64();
  return renderToBuffer(<OrderConfirmationDocument quote={quote} items={items} logoSrc={logoSrc} />);
}

export async function renderWorkOrderPDF(quote: PDFQuote, items: PDFItem[]): Promise<Buffer> {
  const logoSrc = await fetchLogoBase64();
  return renderToBuffer(<WorkOrderDocument quote={quote} items={items} logoSrc={logoSrc} />);
}
