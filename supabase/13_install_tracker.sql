ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS install_quote_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS install_stage      text;
