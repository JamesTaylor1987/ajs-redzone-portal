import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://mutkxagbagutlqhfesdm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11dGt4YWdiYWd1dGxxaGZlc2RtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMyNTg3MSwiZXhwIjoyMDk1OTAxODcxfQ.T3rnt5ZAX_UbjrJC8fGzhb4Fnn1GEXl9Dov90oBQKqs",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 500 });
for (const u of users) {
  const role = u.app_metadata?.role ?? "(no role)";
  console.log(`${role.padEnd(16)} ${u.email}`);
}
