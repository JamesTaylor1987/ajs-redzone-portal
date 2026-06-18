-- Add phone number to Redzone PM records
ALTER TABLE rz_pms ADD COLUMN IF NOT EXISTS phone text;
