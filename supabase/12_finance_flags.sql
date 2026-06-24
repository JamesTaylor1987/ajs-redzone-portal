ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS invoiced         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_received boolean NOT NULL DEFAULT false;
