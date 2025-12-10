-- Create lead_notes table for internal comments and activity tracking
CREATE TABLE IF NOT EXISTS lead_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_content TEXT NOT NULL,
  mentions JSONB DEFAULT '[]', -- Store array of mentioned user IDs and names
  is_system_note BOOLEAN DEFAULT false, -- For automated system notes (assignments, status changes, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_user_id ON lead_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON lead_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_notes_mentions ON lead_notes USING GIN(mentions);

-- Enable Row Level Security
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

-- Policy for users to view notes for leads they have access to
-- This leverages the existing lead RLS policies to ensure users can only see notes for leads they can access
CREATE POLICY "Users can view notes for accessible leads" ON lead_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads 
      WHERE leads.id = lead_notes.lead_id
    )
  );

-- Policy for authenticated users to insert notes for leads they have access to
CREATE POLICY "Users can insert notes for accessible leads" ON lead_notes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM leads 
      WHERE leads.id = lead_notes.lead_id
    )
  );

-- Policy for users to update their own notes
CREATE POLICY "Users can update their own notes" ON lead_notes
  FOR UPDATE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM leads 
      WHERE leads.id = lead_notes.lead_id
    )
  );

-- Policy for admins to manage all notes
CREATE POLICY "Admins can manage all notes" ON lead_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lead_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_lead_notes_updated_at_trigger
    BEFORE UPDATE ON lead_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_notes_updated_at();

-- Create a function to extract mentions from note content
-- This will parse @username patterns and return user information
CREATE OR REPLACE FUNCTION extract_mentions_from_note(note_text TEXT)
RETURNS JSONB AS $$
DECLARE
    mention_pattern TEXT := '@(\w+)';
    mentioned_users JSONB := '[]';
    user_record RECORD;
    username_match TEXT;
    matches TEXT[];
BEGIN
    -- Find all @mentions in the text
    FOR matches IN 
        SELECT regexp_matches(note_text, mention_pattern, 'g')
    LOOP
        username_match := matches[1];
        
        -- Try to find user by email prefix (common pattern)
        FOR user_record IN
            SELECT p.id, p.first_name, p.last_name, u.email
            FROM profiles p
            JOIN auth.users u ON p.id = u.id
            WHERE SPLIT_PART(u.email, '@', 1) = username_match
            OR LOWER(CONCAT(p.first_name, p.last_name)) = LOWER(username_match)
            OR LOWER(p.first_name) = LOWER(username_match)
        LOOP
            -- Add to mentions array if not already present
            mentioned_users := mentioned_users || jsonb_build_object(
                'user_id', user_record.id,
                'username', username_match,
                'full_name', CONCAT(user_record.first_name, ' ', user_record.last_name),
                'email', user_record.email
            );
        END LOOP;
    END LOOP;
    
    RETURN mentioned_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to automatically extract mentions when inserting/updating notes
CREATE OR REPLACE FUNCTION process_note_mentions()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract mentions from the note content
    NEW.mentions := extract_mentions_from_note(NEW.note_content);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to process mentions on insert/update
CREATE TRIGGER process_note_mentions_trigger
    BEFORE INSERT OR UPDATE ON lead_notes
    FOR EACH ROW
    EXECUTE FUNCTION process_note_mentions();