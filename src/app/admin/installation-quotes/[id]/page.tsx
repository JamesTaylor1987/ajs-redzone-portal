import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthClient } from "@/lib/supabase-auth";
import { getServiceClient } from "@/lib/supabase-server";
import { sendInstallQuoteAction } from "./actions";
import { AssessmentForm } from "./AssessmentForm";
import type { AssessmentInputs } from "@/lib/installation-quote/calculate";
import { INSTALL_CONFIG } from "@/lib/installation-quote/config";
import { INSTALL_RATE_KEYS } from "@/lib/installation-quote/settings-keys";
import { DEFAULT_INSTALL_EXCLUSIONS } from "@/lib/quote-pdf";

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

  // Fetch hardware quote items, auto-count sensors, and current install rates in parallel
  const [itemsFetch, ratesFetch] = await Promise.all([
    iq.hardware_quote_id
      ? supabase.from("quote_items").select("sku, name, qty, product_id").eq("quote_id", iq.hardware_quote_id)
      : Promise.resolve({ data: [] }),
    supabase.from("settings").select("key, value").in("key", [...INSTALL_RATE_KEYS]),
  ]);
  const items = itemsFetch.data;
  const rateMap = Object.fromEntries((ratesFetch.data ?? []).map((row: { key: string; value: string }) => [row.key, row.value]));
  const rn = (k: string, def: number) => { const v = parseInt(rateMap[k]); return isNaN(v) ? def : v; };
  const rates = {
    pair_day_rate_pence:          rn("install_pair_day_rate",         INSTALL_CONFIG.pair_day_rate_pence),
    hotel_rate_pence:             rn("install_hotel_rate",            INSTALL_CONFIG.hotel_rate_pence),
    mileage_rate_pence_per_mile:  rn("install_mileage_rate",          INSTALL_CONFIG.mileage_rate_pence_per_mile),
    sensors_per_pair_per_day:     rn("install_sensors_per_day",       INSTALL_CONFIG.sensors_per_pair_per_day),
    displays_per_pair_per_day:    rn("install_displays_per_day",      INSTALL_CONFIG.displays_per_pair_per_day),
    eurotunnel_pence:             rn("install_eurotunnel",            INSTALL_CONFIG.eurotunnel_pence),
    flight_estimate_europe_pence: rn("install_flight_europe",         INSTALL_CONFIG.flight_estimate_europe_pence),
    contingency_low:              rn("install_contingency_low",       Math.round(INSTALL_CONFIG.contingency_low  * 100)) / 100,
    contingency_high:             rn("install_contingency_high",      Math.round(INSTALL_CONFIG.contingency_high * 100)) / 100,
    out_of_hours_multiplier:      rn("install_out_of_hours_multiplier", Math.round(INSTALL_CONFIG.out_of_hours_multiplier * 100)) / 100,
  };

  let autoSensorCount = 0;
  if (items && (items as any[]).length > 0) {
    const productIds = (items as any[]).map((i: { product_id: string }) => i.product_id).filter(Boolean);
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

  const defaultExclusions = (() => {
    if (iq.exclusions) return iq.exclusions;
    let lines = DEFAULT_INSTALL_EXCLUSIONS.split("\n");
    if (a?.include_vf) lines = lines.filter((l) => !l.includes("TVs and tablets"));
    if (a?.working_hours === "out_of_hours") lines = lines.filter((l) => !l.includes("Out of hours working"));
    return lines.join("\n");
  })();

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
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
          <strong>Last sent</strong> — emailed to {iq.customer_email} on{" "}
          {iq.email_sent_at ? new Date(iq.email_sent_at).toLocaleString("en-GB") : "—"}.
          Budget: {gbp(iq.budget_from_pence)} – {gbp(iq.budget_to_pence)}.
          Update the figures below and resend at any time.
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

      <AssessmentForm
        id={iq.id}
        hasCalc={hasCalc}
        assessment={a}
        autoSensorCount={autoSensorCount}
      />

      {/* Calculation workings */}
      {hasCalc && a && <CalcWorkings iq={iq} a={a} rates={rates} />}

      {/* Calculation results + send */}
      {hasCalc && (
        <div key={`${iq.budget_from_pence ?? 0}-${iq.budget_to_pence ?? 0}`} className="bg-white rounded-xl border border-ajs-light p-5 space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">Budget calculation</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="Install days"  value={String(iq.calc_install_days ?? "—")} />
            <Stat label="Total days"    value={String(iq.calc_total_days ?? "—")} />
            <Stat label="Labour"        value={gbp(iq.calc_labour_pence)} />
            <Stat label="Travel"        value={gbp(iq.calc_travel_pence)} />
            <Stat label="Hotel &amp; stop out" value={gbp(iq.calc_hotels_pence)} />
            <Stat label="Infra uplift"  value={gbp(iq.calc_infra_uplift_pence)} />
            <Stat label="Subtotal"      value={gbp(iq.calc_subtotal_pence)} />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-xs text-ajs-muted uppercase tracking-wide mb-1">Calculated range (ex-VAT)</div>
            <div className="text-2xl font-extrabold text-ajs-primary">
              {gbp(iq.calc_low_pence)} – {gbp(iq.calc_high_pence)}
            </div>
          </div>

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
                        defaultValue={iq.budget_to_pence != null && Number(iq.budget_to_pence) !== Number(iq.budget_from_pence) ? (Number(iq.budget_to_pence) / 100).toFixed(0) : ""}
                        placeholder="Leave blank for fixed price"
                        className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
                      />
                      <p className="text-xs text-ajs-muted mt-1">Leave blank for a fixed price</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
                        Containment notes (optional)
                      </label>
                      <textarea
                        name="containment_notes"
                        rows={3}
                        defaultValue={iq.containment_notes ?? ""}
                        placeholder="e.g. AJS to supply and fit 20m of 50×50 steel trunking along the main conveyor line…"
                        className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40 resize-none"
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
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
                        Payment terms
                      </label>
                      <textarea
                        name="payment_terms"
                        rows={4}
                        defaultValue={iq.payment_terms ?? "50% upon order placement\n25% upon receipt of hardware\n15% upon completion of installation\n10% upon confirmation that Redzone counts are good"}
                        className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40 resize-none font-mono"
                      />
                      <p className="text-xs text-ajs-muted mt-1">One term per line — each becomes a bullet point on the PDF</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
                        Exclusions
                      </label>
                      <textarea
                        name="exclusions"
                        rows={5}
                        defaultValue={defaultExclusions}
                        className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40 resize-none font-mono"
                      />
                      <p className="text-xs text-ajs-muted mt-1">One exclusion per line — each becomes a bullet point on the PDF</p>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-lg font-bold text-white bg-ajs-primary hover:bg-ajs-dark text-sm"
                  >
                    {isQuoted ? "Resend updated quote" : "Send quote"} to {iq.customer_email}
                </button>
              </form>
            </div>
        </div>
      )}
    </div>
  );
}

function CalcWorkings({
  iq,
  a,
  rates,
}: {
  iq: Record<string, any>;
  a: AssessmentInputs;
  rates: {
    pair_day_rate_pence: number;
    hotel_rate_pence: number;
    mileage_rate_pence_per_mile: number;
    sensors_per_pair_per_day: number;
    displays_per_pair_per_day: number;
    eurotunnel_pence: number;
    flight_estimate_europe_pence: number;
    contingency_low: number;
    contingency_high: number;
    out_of_hours_multiplier: number;
  };
}) {
  const sensor_days = a.sensor_count > 0 ? Math.ceil(a.sensor_count / rates.sensors_per_pair_per_day) : 0;
  const vf_days = a.include_vf && a.vf_item_count > 0 ? Math.ceil(a.vf_item_count / rates.displays_per_pair_per_day) : 0;
  const install_days = Math.max(1, sensor_days + vf_days);
  const travel_days_total = a.travel_days_one_way * 2;
  const total_days = travel_days_total + install_days;
  const staying_away = a.staying_away !== false;
  const hotel_nights = staying_away ? Math.max(0, total_days - 1) : 0;
  const subtotal = Number(iq.calc_subtotal_pence ?? 0);

  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5 space-y-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">How this was calculated</h2>

      {/* Days */}
      <WorkSection title="Days on site">
        {a.sensor_count > 0 && (
          <WorkRow label="Sensor/unit install days" expr={`${a.sensor_count} units ÷ ${rates.sensors_per_pair_per_day}/day`} result={`${sensor_days} day${sensor_days !== 1 ? "s" : ""}`} />
        )}
        {a.include_vf && a.vf_item_count > 0 && (
          <WorkRow label="Visual Factory days" expr={`${a.vf_item_count} streamers ÷ ${rates.displays_per_pair_per_day}/day`} result={`${vf_days} day${vf_days !== 1 ? "s" : ""}`} />
        )}
        <WorkRow label="Install days" expr={sensor_days + vf_days < 1 ? "Minimum 1 day applied" : undefined} result={`${install_days} day${install_days !== 1 ? "s" : ""}`} bold />
        {a.travel_days_one_way > 0 && (
          <WorkRow label="Travel days" expr={`${a.travel_days_one_way} day each way × 2`} result={`${travel_days_total} days`} />
        )}
        <WorkRow label="Total days" result={`${total_days} day${total_days !== 1 ? "s" : ""}`} bold />
      </WorkSection>

      {/* Labour */}
      <WorkSection title="Labour">
        {a.working_hours === "standard" && (
          <WorkRow label="Pair day rate" expr={`${total_days} days × ${gbp(rates.pair_day_rate_pence)}/day`} result={gbp(Number(iq.calc_labour_pence))} bold />
        )}
        {a.working_hours === "out_of_hours" && (
          <>
            <WorkRow label="Pair day rate" result={gbp(rates.pair_day_rate_pence) + "/day"} />
            <WorkRow label="Out-of-hours multiplier" result={`×${rates.out_of_hours_multiplier}`} />
            <WorkRow label="Total labour" expr={`${total_days} days × ${gbp(rates.pair_day_rate_pence)} × ${rates.out_of_hours_multiplier}`} result={gbp(Number(iq.calc_labour_pence))} bold />
          </>
        )}
        {a.working_hours === "mixed" && (
          <>
            <WorkRow label="Travel days (standard rate)" expr={`${travel_days_total} days × ${gbp(rates.pair_day_rate_pence)}/day`} result={gbp(travel_days_total * rates.pair_day_rate_pence)} />
            <WorkRow label="Install days (OOH rate)" expr={`${install_days} days × ${gbp(rates.pair_day_rate_pence)} × ${rates.out_of_hours_multiplier}`} result={gbp(Math.round(install_days * rates.pair_day_rate_pence * rates.out_of_hours_multiplier))} />
            <WorkRow label="Total labour" result={gbp(Number(iq.calc_labour_pence))} bold />
          </>
        )}
      </WorkSection>

      {/* Travel */}
      {Number(iq.calc_travel_pence) > 0 && (
        <WorkSection title="Travel">
          {a.travel_method === "drive" && (
            <WorkRow label="Mileage (return)" expr={`${a.drive_miles} miles × 2 × ${rates.mileage_rate_pence_per_mile}p/mile`} result={gbp(Number(iq.calc_travel_pence))} bold />
          )}
          {a.travel_method === "eurotunnel" && (
            <>
              {a.drive_miles > 0 && <WorkRow label="Mileage to tunnel" expr={`${a.drive_miles} miles × 2 × ${rates.mileage_rate_pence_per_mile}p/mile`} result={gbp(Math.round(a.drive_miles * 2 * rates.mileage_rate_pence_per_mile))} />}
              <WorkRow label="Eurotunnel crossings" expr={`${gbp(rates.eurotunnel_pence)} × 2 (return)`} result={gbp(rates.eurotunnel_pence * 2)} />
              <WorkRow label="Total travel" result={gbp(Number(iq.calc_travel_pence))} bold />
            </>
          )}
          {a.travel_method === "fly" && (
            <WorkRow label="Flights" expr={`2 engineers × ${gbp(rates.flight_estimate_europe_pence)} estimate`} result={gbp(Number(iq.calc_travel_pence))} bold />
          )}
        </WorkSection>
      )}

      {/* Hotels */}
      {staying_away && hotel_nights > 0 && (
        <WorkSection title="Accommodation">
          <WorkRow label="Hotel nights" expr={`${total_days} total days − 1`} result={`${hotel_nights} night${hotel_nights !== 1 ? "s" : ""}`} />
          <WorkRow label="Hotel cost" expr={`${hotel_nights} nights × 2 engineers × ${gbp(rates.hotel_rate_pence)}/night`} result={gbp(Number(iq.calc_hotels_pence))} bold />
        </WorkSection>
      )}
      {!staying_away && (
        <WorkSection title="Accommodation">
          <WorkRow label="Not staying away" result="£0 — engineers returning each day" />
        </WorkSection>
      )}

      {/* Infrastructure */}
      {Number(iq.calc_infra_uplift_pence) > 0 && (
        <WorkSection title="Infrastructure uplift">
          <WorkRow
            label={a.site_infrastructure === "partial" ? "Partial infrastructure" : "No infrastructure"}
            result={gbp(Number(iq.calc_infra_uplift_pence))}
            bold
          />
        </WorkSection>
      )}

      {/* Budget range */}
      <WorkSection title="Budget range">
        <WorkRow label="Subtotal" result={gbp(subtotal)} bold />
        <WorkRow
          label={`Low end (×${rates.contingency_low})`}
          expr={`${gbp(subtotal)} × ${rates.contingency_low} — allows for scope being efficient`}
          result={gbp(Number(iq.calc_low_pence))}
        />
        <WorkRow
          label={`High end (×${rates.contingency_high})`}
          expr={`${gbp(subtotal)} × ${rates.contingency_high} — allows for complications`}
          result={gbp(Number(iq.calc_high_pence))}
          bold
        />
      </WorkSection>
    </div>
  );
}

function WorkSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-ajs-muted mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function WorkRow({ label, expr, result, bold }: { label: string; expr?: string; result: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <div className="min-w-0">
        <span className={bold ? "font-semibold text-ajs-dark" : "text-ajs-text"}>{label}</span>
        {expr && <span className="text-xs text-ajs-muted ml-2">{expr}</span>}
      </div>
      <span className={`shrink-0 font-mono text-xs ${bold ? "font-bold text-ajs-dark" : "text-ajs-muted"}`}>{result}</span>
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

