ALTER TABLE installation_quotes
  ADD COLUMN IF NOT EXISTS exclusions text;
