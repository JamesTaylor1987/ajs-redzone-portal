"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveInstallRatesAction, type SettingsState } from "./actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save rates"}
    </button>
  );
}

export interface InstallRates {
  engineer_day_rate: number;
  hotel_rate: number;
  mileage_rate: number;
  sensors_per_day: number;
  contingency_low: number;
  contingency_high: number;
  out_of_hours_multiplier: number;
  partial_infra_uplift: number;
  no_infra_uplift: number;
  flight_europe: number;
  flight_long_haul: number;
}

interface Props { current: InstallRates }

export function InstallRatesPicker({ current }: Props) {
  const [state, action] = useFormState<SettingsState, FormData>(saveInstallRatesAction, {});

  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5 space-y-5">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">Installation calculation rates</h2>
        <p className="text-xs text-ajs-muted mt-1">These values drive the automatic budget estimate. Changes take effect on the next assessment.</p>
      </div>

      {state.success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-2.5 font-semibold">
          Rates saved.
        </div>
      )}
      {state.error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-2.5">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-6">
        <Section label="Labour">
          <RateField name="engineer_day_rate" label="Engineer day rate" unit="£ / day" defaultValue={current.engineer_day_rate} />
          <RateField name="sensors_per_day" label="Sensors per engineer per day" unit="units" defaultValue={current.sensors_per_day} />
          <RateField name="out_of_hours_multiplier" label="Out-of-hours multiplier" unit="%" defaultValue={current.out_of_hours_multiplier} hint="100 = standard rate, 150 = 1.5×" />
        </Section>

        <Section label="Travel & accommodation">
          <RateField name="mileage_rate" label="Mileage rate" unit="p / mile" defaultValue={current.mileage_rate} />
          <RateField name="hotel_rate" label="Hotel rate per night" unit="£ / night" defaultValue={current.hotel_rate} />
          <RateField name="flight_europe" label="EU / domestic flight (per engineer)" unit="£" defaultValue={current.flight_europe} />
          <RateField name="flight_long_haul" label="Long-haul flight (per engineer)" unit="£" defaultValue={current.flight_long_haul} />
        </Section>

        <Section label="Site infrastructure uplifts (flat fees)">
          <RateField name="partial_infra_uplift" label="Partially in place" unit="£" defaultValue={current.partial_infra_uplift} />
          <RateField name="no_infra_uplift" label="Starting from scratch" unit="£" defaultValue={current.no_infra_uplift} />
        </Section>

        <Section label="Budget range — % of calculated subtotal">
          <RateField name="contingency_low" label="Low end" unit="%" defaultValue={current.contingency_low} hint="e.g. 90 = −10% of subtotal" />
          <RateField name="contingency_high" label="High end" unit="%" defaultValue={current.contingency_high} hint="e.g. 115 = +15% of subtotal" />
        </Section>

        <SaveButton />
      </form>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-ajs-muted mb-3">{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function RateField({ name, label, unit, defaultValue, hint }: {
  name: string; label: string; unit: string; defaultValue: number; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
        {label}{" "}
        <span className="font-normal text-ajs-muted normal-case tracking-normal">({unit})</span>
      </label>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue}
        min={0}
        step={1}
        className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
      />
      {hint && <p className="text-xs text-ajs-muted mt-1">{hint}</p>}
    </div>
  );
}
