-- Migration: Add closed_date field to deals table
-- This field will store the actual date when a deal was closed (won/lost)

BEGIN;

-- Add closed_date column to deals table
ALTER TABLE deals 
ADD COLUMN closed_date TIMESTAMP WITH TIME ZONE;

-- Create index for better performance when querying by closed_date
CREATE INDEX idx_deals_closed_date ON deals(closed_date);

-- Update existing won/lost deals to set closed_date = updated_at
-- This provides a reasonable historical value for existing closed deals
UPDATE deals 
SET closed_date = updated_at 
WHERE stage IN ('won', 'lost') AND closed_date IS NULL;

-- Create a trigger function to automatically set closed_date when deal stage changes to won/lost
CREATE OR REPLACE FUNCTION set_deal_closed_date()
RETURNS TRIGGER AS $$
BEGIN
  -- If stage is changing to won or lost, set closed_date to now
  IF NEW.stage IN ('won', 'lost') AND OLD.stage NOT IN ('won', 'lost') THEN
    NEW.closed_date = NOW();
  END IF;
  
  -- If stage is changing from won/lost back to open, clear closed_date
  IF NEW.stage NOT IN ('won', 'lost') AND OLD.stage IN ('won', 'lost') THEN
    NEW.closed_date = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_set_deal_closed_date ON deals;
CREATE TRIGGER trigger_set_deal_closed_date
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION set_deal_closed_date();

COMMIT;