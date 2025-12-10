-- Add status column to calendar_events table for task completion tracking
ALTER TABLE calendar_events 
ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed'));

-- Create index for status column
CREATE INDEX idx_calendar_events_status ON calendar_events(status);