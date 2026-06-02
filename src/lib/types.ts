/**
 * Domain types for the AJS Redzone Portal.
 * All monetary values are stored as integer pence in GBP.
 */

export type ProductCategory =
  | "panel"
  | "sensor"
  | "accessory"
  | "software"
  | "peripheral";

export type Currency = "GBP" | "EUR";

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: ProductCategory;
  plc: "Siemens" | "Allen Bradley" | null;
  material: "Mild Steel" | "Stainless Steel" | null;
  io_count: number | null;
  price_gbp_pence: number;
  stock_status: string;
  lead_time: string;
  image_url: string | null;
  sort_order: number;
  active: boolean;
}

export interface CartLine {
  productId: string;
  sku: string;
  name: string;
  qty: number;
  unitPricePence: number;   // snapshot at add-to-cart time
}

export interface CheckoutDetails {
  contactName: string;
  contactCompany: string;
  contactEmail: string;
  contactPhone: string;
  siteAddressLine1: string;
  siteAddressLine2: string;
  siteAddressCity: string;
  siteAddressPostcode: string;
  siteCountry: string;
  requiredDate: string;          // ISO date (YYYY-MM-DD)
  projectDescription: string;
  installRequested: boolean;
  installDetails?: InstallDetails;
}

export interface InstallDetails {
  travelMethod?: "drive" | "fly" | "unsure";
  distanceOrFlight?: string;
  sensorCount?: number;
  estimatedDays?: number;
  siteAccessNotes?: string;
  electricianSource?: "customer" | "ajs" | "unsure";
}

export interface CreateQuoteRequest {
  currency: Currency;
  fxRateUsed: number | null;
  lines: CartLine[];
  details: CheckoutDetails;
  shippingPallets: number;
  shippingGbpPence: number | null; // null = EXW
}

export interface StockColourSettings {
  inStock: string;
  lowStock: string;
  outOfStock: string;
}

export interface CreateQuoteResponse {
  ref: string;         // Q26-RZ0001
  id: string;
}
