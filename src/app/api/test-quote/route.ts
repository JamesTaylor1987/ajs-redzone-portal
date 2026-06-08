import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { createDataverseOpportunity } from "@/lib/dataverse";

export const runtime = "nodejs";

export async function POST() {
  const supabase = getServiceClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, sku, name, price_gbp_pence")
    .eq("active", true)
    .limit(1)
    .single();

  if (!product) {
    return NextResponse.json({ error: "No active products found" }, { status: 400 });
  }

  const subtotalPence = product.price_gbp_pence;
  const shippingPence = 15000;

  const dvGuid = await createDataverseOpportunity({
    ref: "TEST-DIRECT",
    contact_name: "Test User",
    contact_company: "Test Company Ltd",
    project_description: "Direct Dataverse test — safe to delete",
    site_name: "Test Site",
    site_address_line1: "1 Test Street",
    site_address_line2: null,
    site_address_city: "Birmingham",
    site_address_postcode: "B1 1BB",
    site_country: "United Kingdom",
    required_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    subtotal_gbp_pence: subtotalPence,
    shipping_gbp_pence: shippingPence,
    submitted_at: new Date().toISOString(),
  });

  return NextResponse.json({
    dvGuid,
    configured: !!(process.env.DATAVERSE_TENANT_ID && process.env.DATAVERSE_CLIENT_ID && process.env.DATAVERSE_CLIENT_SECRET && process.env.DATAVERSE_INSTANCE_URL),
    totalGbp: (subtotalPence + shippingPence) / 100,
  });
}
