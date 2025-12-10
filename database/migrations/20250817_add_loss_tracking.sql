-- Migration: Add loss reason tracking and improve closed date tracking
-- This will help track why deals/leads are lost and when they were actually closed

BEGIN;

-- Add loss_reason and lost_date columns to deals table
ALTER TABLE deals 
ADD COLUMN loss_reason TEXT,
ADD COLUMN lost_date TIMESTAMP WITH TIME ZONE;

-- Add loss_reason and lost_date columns to leads table  
ALTER TABLE leads
ADD COLUMN loss_reason TEXT,
ADD COLUMN lost_date TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX idx_deals_lost_date ON deals(lost_date);
CREATE INDEX idx_leads_lost_date ON leads(lost_date);

-- Update the existing trigger function to handle lost deals
CREATE OR REPLACE FUNCTION set_deal_closed_date()
RETURNS TRIGGER AS $$
BEGIN
  -- If stage is changing to won, set closed_date to now (if not already set)
  IF NEW.stage = 'won' AND OLD.stage != 'won' THEN
    IF NEW.closed_date IS NULL THEN
      NEW.closed_date = NOW();
    END IF;
  END IF;
  
  -- If stage is changing to lost, set lost_date to now (if not already set)
  IF NEW.stage = 'lost' AND OLD.stage != 'lost' THEN
    IF NEW.lost_date IS NULL THEN
      NEW.lost_date = NOW();
    END IF;
  END IF;
  
  -- If stage is changing from won/lost back to open, clear respective dates
  IF NEW.stage NOT IN ('won', 'lost') AND OLD.stage IN ('won', 'lost') THEN
    IF OLD.stage = 'won' THEN
      NEW.closed_date = NULL;
    END IF;
    IF OLD.stage = 'lost' THEN
      NEW.lost_date = NULL;
      NEW.loss_reason = NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create similar trigger function for leads
CREATE OR REPLACE FUNCTION set_lead_status_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is changing to lost, set lost_date to now (if not already set)
  IF NEW.status = 'lost' AND OLD.status != 'lost' THEN
    IF NEW.lost_date IS NULL THEN
      NEW.lost_date = NOW();
    END IF;
  END IF;
  
  -- If status is changing from lost back to other status, clear lost data
  IF NEW.status != 'lost' AND OLD.status = 'lost' THEN
    NEW.lost_date = NULL;
    NEW.loss_reason = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for leads
DROP TRIGGER IF EXISTS trigger_set_lead_status_dates ON leads;
CREATE TRIGGER trigger_set_lead_status_dates
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_lead_status_dates();

COMMIT;