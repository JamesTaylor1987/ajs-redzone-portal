-- Add internal admin notes column to quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS admin_notes text;
