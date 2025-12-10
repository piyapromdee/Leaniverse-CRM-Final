-- Create lead_magnets table for content marketing
CREATE TABLE IF NOT EXISTS lead_magnets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id uuid, -- Will add foreign key constraint later after organizations table is created
    title text NOT NULL,
    description text,
    slug text UNIQUE NOT NULL,
    form_fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    button_text text DEFAULT 'Submit',
    success_message text DEFAULT 'Thank you for your submission!',
    redirect_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lead_magnets_pkey PRIMARY KEY (id)
);

-- Create lead_magnet_submissions table
CREATE TABLE IF NOT EXISTS lead_magnet_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_magnet_id uuid NOT NULL REFERENCES lead_magnets(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES leads(id),
    form_data jsonb NOT NULL,
    ip_address inet,
    user_agent text,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lead_magnet_submissions_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lead_magnets_user_id ON lead_magnets(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_magnets_org_id ON lead_magnets(org_id);
CREATE INDEX IF NOT EXISTS idx_lead_magnets_slug ON lead_magnets(slug);
CREATE INDEX IF NOT EXISTS idx_lead_magnets_is_active ON lead_magnets(is_active);
CREATE INDEX IF NOT EXISTS idx_lead_magnet_submissions_lead_magnet_id ON lead_magnet_submissions(lead_magnet_id);
CREATE INDEX IF NOT EXISTS idx_lead_magnet_submissions_lead_id ON lead_magnet_submissions(lead_id);

-- Enable RLS
ALTER TABLE lead_magnets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_magnet_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_magnets
CREATE POLICY "Users can view lead magnets in their org" ON lead_magnets
    FOR SELECT USING (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR is_active = true -- Public can view active lead magnets
    );

CREATE POLICY "Users can create lead magnets in their org" ON lead_magnets
    FOR INSERT WITH CHECK (
        user_id = auth.uid() 
        AND org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update their own lead magnets" ON lead_magnets
    FOR UPDATE USING (
        user_id = auth.uid()
        AND org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can delete their own lead magnets" ON lead_magnets
    FOR DELETE USING (
        user_id = auth.uid()
        AND org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    );

-- RLS Policies for lead_magnet_submissions
CREATE POLICY "Public can submit to active lead magnets" ON lead_magnet_submissions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM lead_magnets 
            WHERE id = lead_magnet_id 
            AND is_active = true
        )
    );

CREATE POLICY "Users can view submissions for their org's lead magnets" ON lead_magnet_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lead_magnets 
            WHERE lead_magnets.id = lead_magnet_submissions.lead_magnet_id
            AND lead_magnets.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        )
    );

-- Add trigger for updated_at
CREATE TRIGGER update_lead_magnets_updated_at
    BEFORE UPDATE ON lead_magnets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-set org_id trigger
CREATE OR REPLACE FUNCTION set_lead_magnet_org_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.org_id IS NULL THEN
        NEW.org_id := (SELECT org_id FROM profiles WHERE id = NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_lead_magnets_org_id 
    BEFORE INSERT ON lead_magnets
    FOR EACH ROW 
    EXECUTE FUNCTION set_lead_magnet_org_id();