-- Multi-tenancy implementation for Dummi & Co CRM
-- This migration adds organization-level isolation

-- Step 1: Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    plan text DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
    max_users integer DEFAULT 5,
    max_contacts integer DEFAULT 1000,
    features jsonb DEFAULT '{"lead_magnets": true, "email_campaigns": true, "api_access": false}'::jsonb,
    subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'trial', 'suspended', 'cancelled')),
    trial_ends_at timestamp with time zone,
    billing_email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organizations_pkey PRIMARY KEY (id)
);

-- Step 2: Add org_id to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_org_admin boolean DEFAULT false;

-- Step 3: Add org_id to all business tables (only if table exists)
DO $$ 
BEGIN
    -- Add org_id to existing tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        ALTER TABLE companies ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
        ALTER TABLE contacts ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deals') THEN
        ALTER TABLE deals ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
        ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
        ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_campaigns') THEN
        ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_templates') THEN
        ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_targets') THEN
        ALTER TABLE sales_targets ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
    END IF;
    
    -- Add foreign key constraint to lead_magnets if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_magnets') THEN
        -- Add foreign key constraint for org_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'lead_magnets_org_id_fkey' 
            AND table_name = 'lead_magnets'
        ) THEN
            ALTER TABLE lead_magnets ADD CONSTRAINT lead_magnets_org_id_fkey 
            FOREIGN KEY (org_id) REFERENCES organizations(id);
        END IF;
    END IF;
END $$;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_companies_org_id ON companies(org_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org_id ON contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_deals_org_id ON deals(org_id);
CREATE INDEX IF NOT EXISTS idx_leads_org_id ON leads(org_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_id ON calendar_events(org_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_id ON activity_logs(org_id);

-- Step 5: Enable RLS on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Step 6: Create helper function to get user's org_id
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid AS $$
BEGIN
    RETURN (
        SELECT org_id 
        FROM profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create organization RLS policies
CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT USING (id = get_user_org_id());

CREATE POLICY "Org admins can update their organization" ON organizations
    FOR UPDATE USING (
        id = get_user_org_id() 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_org_admin = true
        )
    );

-- Step 8: Update RLS policies for all tables to use org_id

-- Companies policies
DROP POLICY IF EXISTS "Users can view their own companies" ON companies;
DROP POLICY IF EXISTS "Users can insert their own companies" ON companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON companies;

CREATE POLICY "Users can view companies in their org" ON companies
    FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can insert companies in their org" ON companies
    FOR INSERT WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "Users can update companies in their org" ON companies
    FOR UPDATE USING (org_id = get_user_org_id());
CREATE POLICY "Users can delete companies in their org" ON companies
    FOR DELETE USING (org_id = get_user_org_id());

-- Contacts policies
DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON contacts;

CREATE POLICY "Users can view contacts in their org" ON contacts
    FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can insert contacts in their org" ON contacts
    FOR INSERT WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "Users can update contacts in their org" ON contacts
    FOR UPDATE USING (org_id = get_user_org_id());
CREATE POLICY "Users can delete contacts in their org" ON contacts
    FOR DELETE USING (org_id = get_user_org_id());

-- Deals policies
DROP POLICY IF EXISTS "Users can view their own deals" ON deals;
DROP POLICY IF EXISTS "Users can insert their own deals" ON deals;
DROP POLICY IF EXISTS "Users can update their own deals" ON deals;
DROP POLICY IF EXISTS "Users can delete their own deals" ON deals;

CREATE POLICY "Users can view deals in their org" ON deals
    FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can insert deals in their org" ON deals
    FOR INSERT WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "Users can update deals in their org" ON deals
    FOR UPDATE USING (org_id = get_user_org_id());
CREATE POLICY "Users can delete deals in their org" ON deals
    FOR DELETE USING (org_id = get_user_org_id());

-- Leads policies
DROP POLICY IF EXISTS "Users can view their own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert their own leads" ON leads;
DROP POLICY IF EXISTS "Users can update their own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete their own leads" ON leads;

CREATE POLICY "Users can view leads in their org" ON leads
    FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can insert leads in their org" ON leads
    FOR INSERT WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "Users can update leads in their org" ON leads
    FOR UPDATE USING (org_id = get_user_org_id());
CREATE POLICY "Users can delete leads in their org" ON leads
    FOR DELETE USING (org_id = get_user_org_id());

-- Step 9: Create trigger to auto-set org_id
CREATE OR REPLACE FUNCTION set_org_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.org_id IS NULL THEN
        NEW.org_id := get_user_org_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER set_companies_org_id BEFORE INSERT ON companies
    FOR EACH ROW EXECUTE FUNCTION set_org_id();
CREATE TRIGGER set_contacts_org_id BEFORE INSERT ON contacts
    FOR EACH ROW EXECUTE FUNCTION set_org_id();
CREATE TRIGGER set_deals_org_id BEFORE INSERT ON deals
    FOR EACH ROW EXECUTE FUNCTION set_org_id();
CREATE TRIGGER set_leads_org_id BEFORE INSERT ON leads
    FOR EACH ROW EXECUTE FUNCTION set_org_id();
CREATE TRIGGER set_calendar_events_org_id BEFORE INSERT ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION set_org_id();
CREATE TRIGGER set_activity_logs_org_id BEFORE INSERT ON activity_logs
    FOR EACH ROW EXECUTE FUNCTION set_org_id();

-- Step 10: Create sample organization for testing
INSERT INTO organizations (name, slug, plan, max_users, max_contacts, billing_email)
VALUES 
    ('Dummi & Co', 'dummi-co', 'enterprise', 100, 10000, 'billing@dummi.co'),
    ('Test Company A', 'test-company-a', 'pro', 10, 1000, 'billing@companya.com'),
    ('Test Company B', 'test-company-b', 'pro', 10, 1000, 'billing@companyb.com')
ON CONFLICT (slug) DO NOTHING;

-- Step 11: Update existing data to use Dummi & Co organization
UPDATE profiles 
SET org_id = (SELECT id FROM organizations WHERE slug = 'dummi-co'),
    is_org_admin = CASE WHEN role = 'admin' THEN true ELSE false END
WHERE org_id IS NULL;

-- Update all business data to use the same org_id as the user who created it
UPDATE companies SET org_id = (SELECT org_id FROM profiles WHERE profiles.id = companies.user_id) WHERE org_id IS NULL;
UPDATE contacts SET org_id = (SELECT org_id FROM profiles WHERE profiles.id = contacts.user_id) WHERE org_id IS NULL;
UPDATE deals SET org_id = (SELECT org_id FROM profiles WHERE profiles.id = deals.user_id) WHERE org_id IS NULL;
UPDATE leads SET org_id = (SELECT org_id FROM profiles WHERE profiles.id = leads.user_id) WHERE org_id IS NULL;
UPDATE calendar_events SET org_id = (SELECT org_id FROM profiles WHERE profiles.id = calendar_events.user_id) WHERE org_id IS NULL;
UPDATE activity_logs SET org_id = (SELECT org_id FROM profiles WHERE profiles.id = activity_logs.user_id) WHERE org_id IS NULL;

-- Add updated_at trigger for organizations
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();