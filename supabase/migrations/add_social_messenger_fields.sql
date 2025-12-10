-- Migration: Add Social Messenger Fields to Leads Table
-- This migration adds support for LINE and Facebook Messenger integration

-- Add LINE User ID column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS line_user_id TEXT;

-- Add Facebook User ID column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fb_user_id TEXT;

-- Add channel column if not exists (for categorizing lead sources)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS channel TEXT;

-- Create indexes for faster lookups by social IDs
CREATE INDEX IF NOT EXISTS idx_leads_line_user_id ON leads(line_user_id) WHERE line_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_fb_user_id ON leads(fb_user_id) WHERE fb_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_channel ON leads(channel) WHERE channel IS NOT NULL;

-- Create index on source column for filtering
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source) WHERE source IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN leads.line_user_id IS 'LINE Messenger User ID for leads from LINE';
COMMENT ON COLUMN leads.fb_user_id IS 'Facebook Messenger User ID for leads from Facebook';
COMMENT ON COLUMN leads.channel IS 'Lead acquisition channel (e.g., line, facebook, website, referral)';

-- Insert default lead sources for LINE and Facebook Messenger
-- (This is optional - can be done via API or manually)
-- INSERT INTO lead_sources (name, category, description, is_active)
-- VALUES
--   ('LINE Messenger', 'social', 'Leads from LINE Official Account', true),
--   ('Facebook Messenger', 'social', 'Leads from Facebook Page Messenger', true)
-- ON CONFLICT (name) DO NOTHING;

-- Grant permissions for webhook operations (using service role)
-- Note: This is handled by Supabase service role key in the webhook handlers
