import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthClient } from "@/lib/supabase-auth";
import { getServiceClient } from "@/lib/supabase-server";
import { saveAssessmentAction, sendInstallQuoteAction, reviseInstallQuoteAction } from "./actions";
import type { AssessmentInputs } from "@/lib/installation-quote/calculate";

export const dynamic = "force-dynamic";

const gbp = (p: number | bigint | null | undefined) => {
  if (p == null) return "—";
  return "£" + (Number(p) / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

interface PageProps { params: { id: string } }

export default async function InstallationQuoteDetailPage({ params }: PageProps) {
  const auth = getAuthClient();
  const { data: { session } } = await auth.auth.getSession();
  if (!session) redirect("/admin/login");

  const supabase = getServiceClient();
  const { data: iq } = await supabase
    .from("installation_quotes")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!iq) notFound();

  // Fetch hardware quote items + auto-count sensors
  const { data: items } = iq.hardware_quote_id
    ? await supabase.from("quote_items").select("sku, name, qty, product_id").eq("quote_id", iq.hardware_quote_id)
    : { data: [] };

  let autoSensorCount = 0;
  if (items && items.length > 0) {
    const productIds = items.map((i: { product_id: string }) => i.product_id).filter(Boolean);
    if (productIds.length > 0) {
      const { data: productRows } = await supabase
        .from("products")
        .select("id, category")
        .in("id", productIds);
      const sensorIds = new Set((productRows ?? []).filter((p: { category: string }) => p.category === "sensor").map((p: { id: string }) => p.id));
      autoSensorCount = (items as Array<{ product_id: string; qty: number }>).reduce(
        (sum, item) => sensorIds.has(item.product_id) ? sum + item.qty : sum, 0
      );
    }
  }

  const a = iq.assessment as AssessmentInputs | null;
  const hasCalc = iq.calc_subtotal_pence != null;
  const isQuoted = iq.status === "quoted";

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin/installation-quotes" className="text-ajs-muted text-sm hover:underline">
          ← Installation Quotes
        </Link>
        <span className="text-ajs-light">/</span>
        <span className="font-mono font-bold text-ajs-dark">{iq.quote_ref}</span>
        <StatusBadge status={iq.status} />
      </div>

      {isQuoted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <strong>Budget sent</strong> — emailed to {iq.customer_email} on{" "}
            {iq.email_sent_at ? new Date(iq.email_sent_at).toLocaleString("en-GB") : "—"}.
            Budget: {gbp(iq.budget_from_pence)} – {gbp(iq.budget_to_pence)}.
          </div>
          <form action={reviseInstallQuoteAction}>
            <input type="hidden" name="id" value={iq.id} />
            <button type="submit" className="text-xs font-semibold text-ajs-primary hover:underline whitespace-nowrap">
              Revise quote →
            </button>
          </form>
        </div>
      )}

      {/* Customer & site */}
      <Card title="Customer & site">
        <Row label="Name"    value={iq.customer_name} />
        <Row label="Company" value={iq.company_name} />
        <Row label="Email"   value={iq.customer_email} />
        <Row label="Site"    value={iq.site_name} />
        <Row
          label="Address"
          value={[iq.site_address_line1, iq.site_address_line2, iq.site_address_city, iq.site_address_postcode, iq.site_country]
            .filter(Boolean).join(", ")}
        />
        {iq.required_date && (
          <Row label="Required by" value={new Date(iq.required_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
        )}
        {iq.project_description && (
          <div className="sm:col-span-2">
            <dt className="text-ajs-muted text-sm">Notes</dt>
            <dd className="text-ajs-text text-sm">{iq.project_description}</dd>
          </div>
        )}
      </Card>

      {/* Hardware ordered */}
      {items && items.length > 0 && (
        <div className="bg-white rounded-xl border border-ajs-light p-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-3">
            Hardware ordered
            {iq.hardware_quote_ref && (
              <span className="font-mono font-normal text-ajs-muted ml-2">({iq.hardware_quote_ref})</span>
            )}
          </h2>
          <ul className="divide-y divide-ajs-light text-sm">
            {items.map((i, idx) => (
              <li key={idx} className="py-2 flex justify-between gap-2">
                <span>
                  <span className="font-mono text-xs font-bold text-ajs-dark">{i.sku}</span>{" "}
                  {i.name}
                </span>
                <span className="font-semibold text-ajs-dark">&times; {i.qty}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Assessment form */}
      <div className="bg-white rounded-xl border border-ajs-light p-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-4">
          {hasCalc ? "Re-assess" : "Assessment"}
        </h2>
        <form action={saveAssessmentAction} className="space-y-4">
          <input type="hidden" name="id" value={iq.id} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <SelectField name="travel_method" label="Travel method" defaultValue={a?.travel_method ?? "drive"}>
              <option value="drive">Drive</option>
              <option value="fly">Fly</option>
              <option value="not_sure">Not sure (TBC)</option>
            </SelectField>

            <NumberField name="drive_miles" label="Drive miles (one way)" defaultValue={a?.drive_miles ?? 0} min={0} />

            <SelectField name="travel_days_one_way" label="Travel days (one way)" defaultValue={String(a?.travel_days_one_way ?? 0)}>
              <option value="0">Same day (0 nights)</option>
              <option value="1">1 day travel</option>
              <option value="2">2 days travel</option>
            </SelectField>

            <SelectField name="engineer_count" label="Engineers on site" defaultValue={String(a?.engineer_count ?? 1)}>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </SelectField>

            <NumberField name="sensor_count" label="Sensor / unit count" defaultValue={a?.sensor_count ?? autoSensorCount ?? 1} min={1}
              hint={autoSensorCount > 0 && !a ? `Auto-counted ${autoSensorCount} from this order` : undefined} />

            <SelectField name="working_hours" label="Working hours" defaultValue={a?.working_hours ?? "standard"}>
              <option value="standard">Standard daytime</option>
              <option value="out_of_hours">Nights / weekends only</option>
              <option value="mixed">Mix of both</option>
            </SelectField>

            <SelectField name="site_infrastructure" label="Electrical infrastructure" defaultValue={a?.site_infrastructure ?? "full"}>
              <option value="full">Fully in place</option>
              <option value="partial">Partially in place (+£800)</option>
              <option value="none">Starting from scratch (+£1,500)</option>
            </SelectField>

            <label className="sm:col-span-2 flex items-center gap-2 text-sm text-ajs-text cursor-pointer">
              <input
                type="checkbox"
                name="long_haul"
                defaultChecked={a?.long_haul ?? false}
                className="accent-ajs-primary"
              />
              <span>Long-haul flight (if flying — affects flight cost estimate)</span>
            </label>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg font-bold text-white bg-ajs-primary hover:bg-ajs-dark text-sm"
          >
            Save &amp; Calculate
          </button>
        </form>
      </div>

      {/* Calculation results + send */}
      {hasCalc && (
        <div className="bg-white rounded-xl border border-ajs-light p-5 space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">Budget calculation</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="Install days"  value={String(iq.calc_install_days ?? "—")} />
            <Stat label="Total days"    value={String(iq.calc_total_days ?? "—")} />
            <Stat label="Labour"        value={gbp(iq.calc_labour_pence)} />
            <Stat label="Travel"        value={gbp(iq.calc_travel_pence)} />
            <Stat label="Hotels"        value={gbp(iq.calc_hotels_pence)} />
            <Stat label="Infra uplift"  value={gbp(iq.calc_infra_uplift_pence)} />
            <Stat label="Subtotal"      value={gbp(iq.calc_subtotal_pence)} />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-xs text-ajs-muted uppercase tracking-wide mb-1">Calculated range (ex-VAT)</div>
            <div className="text-2xl font-extrabold text-ajs-primary">
              {gbp(iq.calc_low_pence)} – {gbp(iq.calc_high_pence)}
            </div>
          </div>

          {!isQuoted && (
            <>
              <div className="border-t border-ajs-light pt-4">
                <p className="text-xs text-ajs-muted mb-4">
                  Adjust the figures below before sending — these are what the customer will see.
                </p>
                <form action={sendInstallQuoteAction} className="space-y-4">
                  <input type="hidden" name="id" value={iq.id} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
                        Quote from (£, ex-VAT)
                      </label>
                      <input
                        type="number"
                        name="budget_from"
                        step="1"
                        min="0"
                        defaultValue={iq.budget_from_pence != null ? (Number(iq.budget_from_pence) / 100).toFixed(0) : ""}
                        className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
                        Quote to (£, ex-VAT)
                      </label>
                      <input
                        type="number"
                        name="budget_to"
                        step="1"
                        min="0"
                        defaultValue={iq.budget_to_pence != null ? (Number(iq.budget_to_pence) / 100).toFixed(0) : ""}
                        className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
                        Notes to customer (optional)
                      </label>
                      <textarea
                        name="notes"
                        rows={3}
                        defaultValue={iq.ajs_notes ?? ""}
                        placeholder="Any caveats, assumptions, or additional information…"
                        className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40 resize-none"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-lg font-bold text-white bg-ajs-primary hover:bg-ajs-dark text-sm"
                  >
                    Send quote to {iq.customer_email}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    pending:  "bg-yellow-100 text-yellow-700",
    assessed: "bg-blue-100 text-blue-700",
    quoted:   "bg-green-100 text-green-700",
    declined: "bg-rose-100 text-rose-600",
  };
  const labels: Record<string, string> = {
    pending:  "Pending",
    assessed: "Assessed",
    quoted:   "Budget sent",
    declined: "Declined",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colours[status] ?? "bg-slate-100 text-slate-600"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-3">{title}</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <>
      <dt className="text-ajs-muted">{label}</dt>
      <dd className="font-medium text-ajs-text">{value}</dd>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="text-[10px] text-ajs-muted font-bold uppercase tracking-wide mb-1">{label}</div>
      <div className="font-bold text-ajs-dark">{value}</div>
    </div>
  );
}

function SelectField({ name, label, defaultValue, children }: {
  name: string; label: string; defaultValue: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
      >
        {children}
      </select>
    </div>
  );
}

function NumberField({ name, label, defaultValue, min, hint }: {
  name: string; label: string; defaultValue: number; min?: number; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">{label}</label>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue}
        min={min}
        className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
      />
      {hint && <p className="text-xs text-ajs-primary mt-1">{hint}</p>}
    </div>
  );
}
