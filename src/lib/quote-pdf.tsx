import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

const DARK = "#05618e";
const PRIMARY = "#1886a1";

const s = StyleSheet.create({
  page: { padding: 44, fontFamily: "Helvetica", fontSize: 10, color: "#1e293b", lineHeight: 1.4 },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: DARK },
  brandSub: { fontSize: 9, color: PRIMARY, marginTop: 2 },
  ref: { fontSize: 22, fontFamily: "Helvetica-Bold", color: DARK, marginTop: 6 },
  meta: { fontSize: 9, color: "#64748b", marginTop: 3 },
  divider: { borderBottom: 1, borderColor: "#e6ebed", marginVertical: 14 },
  sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 120, color: "#64748b" },
  value: { flex: 1 },
  thRow: { flexDirection: "row", backgroundColor: "#f8fafc", borderBottom: 1, borderColor: "#e6ebed", padding: "5 6" },
  tdRow: { flexDirection: "row", borderBottom: 1, borderColor: "#f1f5f9", padding: "5 6" },
  colSku: { width: 80, fontSize: 9, color: "#94a3b8" },
  colName: { flex: 1 },
  colQty: { width: 28, textAlign: "center" },
  colTotal: { width: 68, textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6, padding: "0 6" },
  notice: { backgroundColor: "#eff6ff", borderRadius: 4, padding: "10 12", marginTop: 14 },
  noticeText: { fontSize: 9, color: "#1e40af", lineHeight: 1.5 },
  greenBox: { backgroundColor: "#f0fdf4", borderRadius: 4, padding: "10 12", marginTop: 14 },
  greenText: { fontSize: 9, color: "#166534", lineHeight: 1.5 },
  confirmedBadge: { backgroundColor: "#dcfce7", borderRadius: 3, padding: "2 6", marginLeft: 8 },
  confirmedText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#166534" },
  footer: { position: "absolute", bottom: 28, left: 44, right: 44, fontSize: 8, color: "#94a3b8", textAlign: "center" },
  terms: { marginTop: 16, fontSize: 8, color: "#94a3b8", lineHeight: 1.5 },
  // Work order specific
  woHeader: { backgroundColor: DARK, padding: "16 20", marginBottom: 0 },
  woHeaderText: { color: "#ffffff", fontSize: 22, fontFamily: "Helvetica-Bold" },
  woHeaderSub: { color: "rgba(255,255,255,0.65)", fontSize: 9, marginBottom: 4 },
  woDateBanner: { backgroundColor: "#fef9c3", borderBottom: 3, borderColor: "#eab308", padding: "12 20" },
  woDateLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#854d0e", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 },
  woDateValue: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#1e293b" },
  woBody: { padding: "20 20 44" },
});

function money(gbpPence: number | string, currency = "GBP", fxRate: number | null = null): string {
  const pence = Number(gbpPence);
  if (currency === "EUR" && fxRate && fxRate > 1) {
    return "€" + (pence * fxRate / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return "£" + (pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

function CustomerBlock({ quote }: { quote: PDFQuote }) {
  const addr = [
    quote.site_address_line1,
    quote.site_address_line2,
    quote.site_address_city,
    quote.site_address_postcode,
    quote.site_country,
  ].filter(Boolean);

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.sectionTitle}>Customer</Text>
      <View style={s.row}><Text style={s.label}>Name</Text><Text style={s.value}>{quote.contact_name}</Text></View>
      {!!quote.contact_company && <View style={s.row}><Text style={s.label}>Company</Text><Text style={s.value}>{quote.contact_company}</Text></View>}
      <View style={s.row}><Text style={s.label}>Email</Text><Text style={s.value}>{quote.contact_email}</Text></View>
      {!!quote.contact_phone && <View style={s.row}><Text style={s.label}>Phone</Text><Text style={s.value}>{quote.contact_phone}</Text></View>}
      {!!quote.required_date && (
        <View style={s.row}>
          <Text style={s.label}>Required by</Text>
          <Text style={s.value}>{new Date(quote.required_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</Text>
        </View>
      )}
      {addr.length > 0 && (
        <View style={s.row}>
          <Text style={s.label}>Delivery address</Text>
          <Text style={s.value}>{addr.join(", ")}</Text>
        </View>
      )}
    </View>
  );
}

function ItemsTable({ quote, items }: { quote: PDFQuote; items: PDFItem[] }) {
  const ccy = quote.currency ?? "GBP";
  const fx = quote.fx_rate_used ?? null;
  const total = items.reduce((sum, i) => sum + Number(i.line_total_gbp_pence), 0);

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={s.sectionTitle}>Items</Text>
      <View style={s.thRow}>
        <Text style={[s.colSku, s.bold]}>Part code</Text>
        <Text style={[s.colName, s.bold]}>Description</Text>
        <Text style={[s.colQty, s.bold]}>Qty</Text>
        <Text style={[s.colTotal, s.bold]}>Total</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={s.tdRow}>
          <Text style={s.colSku}>{item.sku}</Text>
          <Text style={s.colName}>{item.name}</Text>
          <Text style={s.colQty}>{item.qty}</Text>
          <Text style={s.colTotal}>{money(item.line_total_gbp_pence, ccy, fx)}</Text>
        </View>
      ))}
      <View style={s.totalRow}>
        <Text style={[s.bold, { marginRight: 8 }]}>Subtotal (ex-VAT)</Text>
        <Text style={[s.bold, s.colTotal, { color: DARK, fontSize: 11 }]}>{money(total, ccy, fx)}</Text>
      </View>
      {ccy === "EUR" && (
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 2, padding: "0 6" }}>
          <Text style={{ fontSize: 8, color: "#94a3b8" }}>Indicative EUR rate — invoice issued in GBP</Text>
        </View>
      )}
    </View>
  );
}

function PageFooter({ quoteRef }: { quoteRef: string }) {
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

// ── Quote request PDF ────────────────────────────────────────────────────────

function QuoteRequestDocument({ quote, items }: { quote: PDFQuote; items: PDFItem[] }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>AJS Control & Automation</Text>
        <Text style={s.brandSub}>Redzone Hardware Portal</Text>
        <Text style={s.ref}>{quote.ref}</Text>
        <Text style={s.meta}>
          Quote request · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </Text>
        <View style={s.divider} />
        <CustomerBlock quote={quote} />
        <View style={s.divider} />
        <ItemsTable quote={quote} items={items} />
        <View style={s.notice}>
          <Text style={s.noticeText}>
            This document confirms receipt of your quote request. Prices shown are indicative and subject to
            confirmation by the AJS Redzone team. You will receive your priced quote by email with a personal
            link to review, amend, and accept.
          </Text>
        </View>
        <Text style={s.terms}>
          All prices ex-VAT. VAT applied on invoice based on registration status.{"\n"}
          Hardware invoiced 100% prior to shipment. DAP delivery terms.
        </Text>
        <PageFooter quoteRef={quote.ref} />
      </Page>
    </Document>
  );
}

// ── Order confirmation PDF ───────────────────────────────────────────────────

function OrderConfirmationDocument({ quote, items }: { quote: PDFQuote; items: PDFItem[] }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>AJS Control & Automation</Text>
        <Text style={s.brandSub}>Redzone Hardware Portal</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
          <Text style={s.ref}>{quote.ref}</Text>
          <View style={s.confirmedBadge}>
            <Text style={s.confirmedText}>ORDER CONFIRMED</Text>
          </View>
        </View>
        <Text style={s.meta}>
          Confirmed · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </Text>
        <View style={s.divider} />
        <CustomerBlock quote={quote} />
        <View style={s.divider} />
        <ItemsTable quote={quote} items={items} />
        <View style={s.greenBox}>
          <Text style={[s.greenText, s.bold, { marginBottom: 3 }]}>What happens next</Text>
          <Text style={s.greenText}>
            An invoice will be issued within 24 hours, payable 100% prior to shipment.
            Once payment is received your order moves into production.
            You will receive automated updates at each stage.
          </Text>
        </View>
        <Text style={s.terms}>
          All prices ex-VAT. VAT applied on invoice based on registration status.{"\n"}
          Hardware invoiced 100% prior to shipment. DAP delivery terms.
        </Text>
        <PageFooter quoteRef={quote.ref} />
      </Page>
    </Document>
  );
}

// ── Work order PDF (no prices — operational use only) ───────────────────────

function WorkOrderDocument({ quote, items }: { quote: PDFQuote; items: PDFItem[] }) {
  const requiredDate = quote.required_date
    ? new Date(quote.required_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "NOT SPECIFIED";

  const addr = [
    quote.site_address_line1,
    quote.site_address_line2,
    quote.site_address_city,
    quote.site_address_postcode,
    quote.site_country,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={{ fontFamily: "Helvetica", fontSize: 10, color: "#1e293b" }}>
        {/* Dark header */}
        <View style={s.woHeader}>
          <Text style={s.woHeaderSub}>AJS Redzone — Work Order</Text>
          <Text style={s.woHeaderText}>{quote.ref}</Text>
        </View>

        {/* Required date banner */}
        <View style={s.woDateBanner}>
          <Text style={s.woDateLabel}>Required delivery date</Text>
          <Text style={s.woDateValue}>{requiredDate}</Text>
        </View>

        <View style={s.woBody}>
          {/* Customer & delivery */}
          <View style={{ marginBottom: 16 }}>
            <Text style={s.sectionTitle}>Customer & delivery</Text>
            <View style={s.row}>
              <Text style={s.label}>Customer</Text>
              <Text style={[s.value, s.bold]}>
                {quote.contact_name}{quote.contact_company ? ` — ${quote.contact_company}` : ""}
              </Text>
            </View>
            {!!quote.contact_phone && (
              <View style={s.row}><Text style={s.label}>Phone</Text><Text style={s.value}>{quote.contact_phone}</Text></View>
            )}
            {addr.length > 0 && (
              <View style={s.row}>
                <Text style={s.label}>Delivery address</Text>
                <Text style={[s.value, s.bold]}>{addr.join(", ")}</Text>
              </View>
            )}
          </View>

          <View style={s.divider} />

          {/* Parts list — NO prices */}
          <View style={{ marginBottom: 8 }}>
            <Text style={s.sectionTitle}>Parts to build / ship</Text>
            <View style={s.thRow}>
              <Text style={[{ width: 90 }, s.bold]}>Part code</Text>
              <Text style={[{ flex: 1 }, s.bold]}>Description</Text>
              <Text style={[{ width: 40, textAlign: "center" }, s.bold]}>Qty</Text>
            </View>
            {items.map((item, i) => (
              <View key={i} style={s.tdRow}>
                <Text style={[{ width: 90, fontFamily: "Helvetica-Bold", fontSize: 11, color: "#1e293b" }]}>{item.sku}</Text>
                <Text style={{ flex: 1 }}>{item.name}</Text>
                <Text style={{ width: 40, textAlign: "center", fontFamily: "Helvetica-Bold", fontSize: 14, color: DARK }}>{item.qty}</Text>
              </View>
            ))}
          </View>

          {!!quote.install_requested && (
            <View style={{ backgroundColor: "#fff7ed", borderRadius: 4, padding: "10 12", marginTop: 14 }}>
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#9a3412" }}>
                Installation requested — separate installation quote in progress. See portal for details.
              </Text>
            </View>
          )}

          <Text style={[s.terms, { marginTop: 24 }]}>
            Generated by AJS Redzone Portal · {quote.ref}
          </Text>
        </View>

        <Text
          style={[s.footer, { bottom: 16 }]}
          render={({ pageNumber, totalPages }) =>
            `${quote.ref}  ·  Page ${pageNumber} of ${totalPages}  ·  AJS Spalding Ltd  ·  rz@ajsspalding.co.uk  ·  01406 424954`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

// ── Render helpers ───────────────────────────────────────────────────────────

export async function renderQuoteRequestPDF(quote: PDFQuote, items: PDFItem[]): Promise<Buffer> {
  return renderToBuffer(<QuoteRequestDocument quote={quote} items={items} />);
}

export async function renderOrderConfirmationPDF(quote: PDFQuote, items: PDFItem[]): Promise<Buffer> {
  return renderToBuffer(<OrderConfirmationDocument quote={quote} items={items} />);
}

export async function renderWorkOrderPDF(quote: PDFQuote, items: PDFItem[]): Promise<Buffer> {
  return renderToBuffer(<WorkOrderDocument quote={quote} items={items} />);
}
