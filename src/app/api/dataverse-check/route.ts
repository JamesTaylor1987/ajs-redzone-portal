import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const TENANT_ID = process.env.DATAVERSE_TENANT_ID;
  const CLIENT_ID = process.env.DATAVERSE_CLIENT_ID;
  const CLIENT_SECRET = process.env.DATAVERSE_CLIENT_SECRET;
  const INSTANCE_URL = process.env.DATAVERSE_INSTANCE_URL?.replace(/\/$/, "");

  const envCheck = {
    DATAVERSE_TENANT_ID:     !!TENANT_ID,
    DATAVERSE_CLIENT_ID:     !!CLIENT_ID,
    DATAVERSE_CLIENT_SECRET: !!CLIENT_SECRET,
    DATAVERSE_INSTANCE_URL:  !!INSTANCE_URL,
  };

  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !INSTANCE_URL) {
    return NextResponse.json({ envCheck, tokenTest: "skipped — missing env vars" });
  }

  try {
    const res = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "client_credentials",
          scope: `${INSTANCE_URL}/.default`,
        }),
      },
    );

    const body = await res.json();

    if (!res.ok) {
      return NextResponse.json({ envCheck, tokenTest: "failed", status: res.status, error: body });
    }

    return NextResponse.json({ envCheck, tokenTest: "success", hasToken: !!body.access_token });
  } catch (err) {
    return NextResponse.json({ envCheck, tokenTest: "exception", error: String(err) });
  }
}
