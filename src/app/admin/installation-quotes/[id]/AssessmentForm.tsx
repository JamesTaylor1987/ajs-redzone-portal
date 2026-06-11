"use client";

import { useState } from "react";
import { saveAssessmentAction } from "./actions";
import type { AssessmentInputs } from "@/lib/installation-quote/calculate";

interface Props {
  id: string;
  hasCalc: boolean;
  assessment: AssessmentInputs | null;
  autoSensorCount: number;
}

export function AssessmentForm({ id, hasCalc, assessment: a, autoSensorCount }: Props) {
  const [isIntl, setIsIntl]     = useState(a?.is_international ?? false);
  const [includeVf, setIncludeVf] = useState(a?.include_vf ?? false);

  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-4">
        {hasCalc ? "Re-assess" : "Assessment"}
      </h2>
      <form action={saveAssessmentAction} className="space-y-4">
        <input type="hidden" name="id" value={id} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* UK / non-UK */}
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-ajs-text cursor-pointer">
            <input
              type="checkbox"
              name="is_international"
              checked={isIntl}
              onChange={(e) => setIsIntl(e.target.checked)}
              className="accent-ajs-primary"
            />
            <span>International job (non-UK) — containment uplift excluded</span>
          </label>

          {/* Travel method */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
              Travel method
            </label>
            <select
              name="travel_method"
              defaultValue={a?.travel_method ?? "drive"}
              className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
            >
              <option value="drive">Drive</option>
              {isIntl && <option value="eurotunnel">Eurotunnel (drive + tunnel)</option>}
              {isIntl && <option value="fly">Fly</option>}
              <option value="not_sure">Not sure (TBC)</option>
            </select>
          </div>

          <NumberField
            name="drive_miles"
            label="Drive miles (one way)"
            defaultValue={a?.drive_miles ?? 0}
            min={0}
            hint={isIntl ? "Used for drive & Eurotunnel options" : undefined}
          />

          <SelectField name="travel_days_one_way" label="Travel days (one way)" defaultValue={String(a?.travel_days_one_way ?? 0)}>
            <option value="0">Same day (0 nights)</option>
            <option value="1">1 day travel</option>
            <option value="2">2 days travel</option>
          </SelectField>

          <NumberField
            name="sensor_count"
            label="Sensor / unit count"
            defaultValue={a?.sensor_count ?? autoSensorCount}
            min={0}
            hint={autoSensorCount > 0 && !a ? `Auto-counted ${autoSensorCount} from this order` : undefined}
          />

          <SelectField name="working_hours" label="Working hours" defaultValue={a?.working_hours ?? "standard"}>
            <option value="standard">Standard daytime</option>
            <option value="out_of_hours">Nights / weekends only</option>
            <option value="mixed">Mix of both</option>
          </SelectField>

          {/* Electrical infrastructure — hidden for international */}
          {!isIntl && (
            <SelectField name="site_infrastructure" label="Electrical infrastructure" defaultValue={a?.site_infrastructure ?? "full"}>
              <option value="full">Fully in place</option>
              <option value="partial">Partially in place (+£800)</option>
              <option value="none">Starting from scratch (+£1,500)</option>
            </SelectField>
          )}
          {isIntl && (
            <input type="hidden" name="site_infrastructure" value="full" />
          )}

          {/* Visual Factory */}
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-ajs-text cursor-pointer">
            <input
              type="checkbox"
              name="include_vf"
              checked={includeVf}
              onChange={(e) => setIncludeVf(e.target.checked)}
              className="accent-ajs-primary"
            />
            <span>Includes Visual Factory installation (mounting TVs &amp; setting up Google Streamers)</span>
          </label>

          {includeVf && (
            <NumberField
              name="vf_item_count"
              label="VF displays / streamers"
              defaultValue={a?.vf_item_count ?? 0}
              min={0}
              hint="Number of screens + streamers to mount and commission"
            />
          )}
          {!includeVf && <input type="hidden" name="vf_item_count" value="0" />}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
            Containment notes (optional)
          </label>
          <textarea
            name="containment_notes"
            rows={3}
            defaultValue=""
            placeholder="e.g. AJS to supply and fit 20m of 50×50 steel trunking along the main conveyor line…"
            className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40 resize-none"
          />
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg font-bold text-white bg-ajs-primary hover:bg-ajs-dark text-sm"
        >
          Save &amp; Calculate
        </button>
      </form>
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
