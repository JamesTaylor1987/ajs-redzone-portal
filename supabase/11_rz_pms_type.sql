-- Add type column to rz_pms so managers can also be stored there
-- and appear in the PM assignment dropdown.
ALTER TABLE rz_pms ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'pm';
