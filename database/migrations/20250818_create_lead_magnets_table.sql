-- Create lead_magnets table
CREATE TABLE IF NOT EXISTS lead_magnets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN (
    'ebook', 'whitepaper', 'template', 'webinar', 'guide', 'checklist',
    'lead_form', 'quiz', 'survey', 'calculator', 'assessment', 'course'
  )),
  file_url text,
  landing_page_url text,
  downloads integer DEFAULT 0,
  leads_generated integer DEFAULT 0,
  is_active boolean DEFAULT true,
  form_fields jsonb, -- For lead forms and interactive content
  settings jsonb, -- Additional settings for each magnet type
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_lead_magnets_user_id ON lead_magnets(user_id);
CREATE INDEX idx_lead_magnets_type ON lead_magnets(type);
CREATE INDEX idx_lead_magnets_is_active ON lead_magnets(is_active);

-- Enable RLS
ALTER TABLE lead_magnets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own lead magnets"
  ON lead_magnets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lead magnets"
  ON lead_magnets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lead magnets"
  ON lead_magnets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lead magnets"
  ON lead_magnets FOR DELETE
  USING (auth.uid() = user_id);

-- Create lead_magnet_submissions table for tracking leads
CREATE TABLE IF NOT EXISTS lead_magnet_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_magnet_id uuid REFERENCES lead_magnets(id) ON DELETE CASCADE NOT NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text,
  company text,
  phone text,
  form_data jsonb, -- Custom form field responses
  ip_address inet,
  user_agent text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for submissions
CREATE INDEX idx_lead_magnet_submissions_magnet_id ON lead_magnet_submissions(lead_magnet_id);
CREATE INDEX idx_lead_magnet_submissions_email ON lead_magnet_submissions(email);
CREATE INDEX idx_lead_magnet_submissions_created_at ON lead_magnet_submissions(created_at);

-- Enable RLS for submissions
ALTER TABLE lead_magnet_submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for submissions
CREATE POLICY "Users can view submissions for their lead magnets"
  ON lead_magnet_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lead_magnets
      WHERE lead_magnets.id = lead_magnet_submissions.lead_magnet_id
      AND lead_magnets.user_id = auth.uid()
    )
  );

-- Public can submit to active lead magnets (for landing pages)
CREATE POLICY "Public can submit to active lead magnets"
  ON lead_magnet_submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lead_magnets
      WHERE lead_magnets.id = lead_magnet_submissions.lead_magnet_id
      AND lead_magnets.is_active = true
    )
  );

-- Function to update lead magnet stats
CREATE OR REPLACE FUNCTION update_lead_magnet_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update leads_generated count
  UPDATE lead_magnets
  SET leads_generated = (
    SELECT COUNT(DISTINCT email)
    FROM lead_magnet_submissions
    WHERE lead_magnet_id = NEW.lead_magnet_id
  )
  WHERE id = NEW.lead_magnet_id;
  
  -- Update downloads count (assuming each submission is a download)
  UPDATE lead_magnets
  SET downloads = (
    SELECT COUNT(*)
    FROM lead_magnet_submissions
    WHERE lead_magnet_id = NEW.lead_magnet_id
  )
  WHERE id = NEW.lead_magnet_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update stats
CREATE TRIGGER update_lead_magnet_stats_trigger
AFTER INSERT ON lead_magnet_submissions
FOR EACH ROW
EXECUTE FUNCTION update_lead_magnet_stats();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_lead_magnets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_lead_magnets_updated_at
BEFORE UPDATE ON lead_magnets
FOR EACH ROW
EXECUTE FUNCTION update_lead_magnets_updated_at();