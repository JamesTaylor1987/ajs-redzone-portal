import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { updateDataverseOpportunity } from "@/lib/dataverse";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const supabase = getServiceClient();
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  // Shipped orders that have been in that status for 10+ minutes (or shipped_at not set = old data)
  const { data: toComplete } = await supabase
    .from("quotes")
    .select("id, dataverse_opportunity_id, shipped_at")
    .eq("status", "shipped")
    .or(`shipped_at.is.null,shipped_at.lte.${cutoff}`);

  if (!toComplete?.length) {
    return NextResponse.json({ completed: 0 });
  }

  const now = new Date().toISOString();
  let count = 0;

  for (const quote of toComplete) {
    const { error } = await supabase
      .from("quotes")
      .update({ status: "complete", completed_at: now })
      .eq("id", quote.id);

    if (!error) {
      count++;
      if (quote.dataverse_opportunity_id) {
        updateDataverseOpportunity(quote.dataverse_opportunity_id, "complete").catch(() => {});
      }
    }
  }

  return NextResponse.json({ completed: count });
}
