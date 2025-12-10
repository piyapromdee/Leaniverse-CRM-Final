-- Create CRM tables for deals, contacts, and companies

-- Companies table
CREATE TABLE companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    industry text,
    size text,
    website text,
    phone text,
    email text,
    address text,
    status text DEFAULT 'prospect' CHECK (status IN ('prospect', 'active', 'inactive')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT companies_pkey PRIMARY KEY (id)
);

-- Contacts table  
CREATE TABLE contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    position text,
    company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
    status text DEFAULT 'lead' CHECK (status IN ('lead', 'prospect', 'customer', 'inactive')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contacts_pkey PRIMARY KEY (id)
);

-- Deals table
CREATE TABLE deals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
    contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
    title text NOT NULL,
    description text,
    value integer DEFAULT 0,
    stage text DEFAULT 'lead' CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
    priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    close_date date,
    assigned_to uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deals_pkey PRIMARY KEY (id)
);

-- Deal-Contact history/activities table
CREATE TABLE deal_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type text NOT NULL CHECK (activity_type IN ('created', 'updated', 'contact_added', 'contact_removed', 'note_added', 'stage_changed')),
    description text NOT NULL,
    metadata jsonb DEFAULT '{}' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deal_activities_pkey PRIMARY KEY (id)
);

-- Create indexes for better performance
CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_deals_user_id ON deals(user_id);
CREATE INDEX idx_deals_company_id ON deals(company_id);
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_assigned_to ON deals(assigned_to);
CREATE INDEX idx_deal_activities_deal_id ON deal_activities(deal_id);
CREATE INDEX idx_deal_activities_user_id ON deal_activities(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Companies policies
CREATE POLICY "Users can view their own companies" ON companies
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own companies" ON companies
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own companies" ON companies
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own companies" ON companies
    FOR DELETE USING (auth.uid() = user_id);

-- Contacts policies
CREATE POLICY "Users can view their own contacts" ON contacts
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contacts" ON contacts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contacts" ON contacts
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contacts" ON contacts
    FOR DELETE USING (auth.uid() = user_id);

-- Deals policies
CREATE POLICY "Users can view their own deals" ON deals
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = assigned_to);
CREATE POLICY "Users can insert their own deals" ON deals
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own deals" ON deals
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = assigned_to);
CREATE POLICY "Users can delete their own deals" ON deals
    FOR DELETE USING (auth.uid() = user_id);

-- Deal activities policies
CREATE POLICY "Users can view deal activities for their deals" ON deal_activities
    FOR SELECT USING (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_activities.deal_id AND (deals.user_id = auth.uid() OR deals.assigned_to = auth.uid())));
CREATE POLICY "Users can insert deal activities for their deals" ON deal_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_activities.deal_id AND (deals.user_id = auth.uid() OR deals.assigned_to = auth.uid())));

-- Create updated_at triggers
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
    BEFORE UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();