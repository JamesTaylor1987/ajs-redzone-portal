ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS site_name      text,
  ADD COLUMN IF NOT EXISTS end_user_name  text,
  ADD COLUMN IF NOT EXISTS end_user_phone text,
  ADD COLUMN IF NOT EXISTS end_user_email text;

CREATE TABLE IF NOT EXISTS lead_followups (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    uuid        NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  note       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_followups_lead_id_idx ON lead_followups(lead_id);
