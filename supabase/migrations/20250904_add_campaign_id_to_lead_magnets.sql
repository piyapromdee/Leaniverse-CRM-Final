-- Add campaign_id field to lead_magnets table for automation feature
-- This allows lead magnets to automatically enroll submissions into email campaigns

-- Add the campaign_id column
ALTER TABLE lead_magnets 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_lead_magnets_campaign_id ON lead_magnets(campaign_id);

-- Add comment to document the feature
COMMENT ON COLUMN lead_magnets.campaign_id IS 'Optional email campaign to automatically enroll leads into when they submit this lead magnet';

-- Update the RLS policy to allow reading campaign information when needed
-- (The existing policies should already handle this, but let's ensure it's clear)

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Added campaign_id field to lead_magnets table successfully!';
    RAISE NOTICE 'Lead magnets can now automatically enroll submissions into email campaigns.';
END $$;