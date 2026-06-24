ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shipping_override_pence bigint;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shipping_label text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS overall_discount_pct numeric(5,2);
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS discount_pct numeric(5,2) NOT NULL DEFAULT 0;
