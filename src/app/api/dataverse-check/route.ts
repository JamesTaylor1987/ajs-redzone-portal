import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    DATAVERSE_TENANT_ID:     !!process.env.DATAVERSE_TENANT_ID,
    DATAVERSE_CLIENT_ID:     !!process.env.DATAVERSE_CLIENT_ID,
    DATAVERSE_CLIENT_SECRET: !!process.env.DATAVERSE_CLIENT_SECRET,
    DATAVERSE_INSTANCE_URL:  !!process.env.DATAVERSE_INSTANCE_URL,
  });
}
