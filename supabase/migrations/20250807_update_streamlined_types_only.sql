-- Update constraint to include essential new activity types without breaking existing data
-- This ensures compatibility with the activities page changes

-- STEP 1: Drop the current constraint
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_type_check;

-- STEP 2: Add constraint that supports both existing and new essential types
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_type_check 
    CHECK (type IN (
        -- Core calendar types (keep existing)
        'task',
        'appointment', 
        'meeting',
        'call',
        
        -- CRM activity types (keep existing)
        'site_visit',
        'traveling',
        'email',
        'follow_up',
        'presentation',
        'negotiation',
        'proposal',
        'demo',
        'training',
        'consultation',
        
        -- Sales activity types (keep existing)
        'lead_qualification',
        'deal_review', 
        'contract_review',
        'closing',
        
        -- Administrative types (keep existing)
        'planning',
        'research',
        'documentation',
        'reporting',
        
        -- NEW: Essential financial types only
        'invoice_sent',
        'payment_follow_up',
        'payment_received',
        
        -- NEW: Essential document type
        'document_review',
        
        -- Generic fallbacks (keep existing)
        'activity',
        'event',
        'other'
    ));

-- STEP 3: Show what types are now supported
SELECT 
    'Updated activity types now include:' as info,
    unnest(ARRAY[
        'Core: meeting, call, email, follow_up, presentation, demo, negotiation, site_visit, consultation',
        'Sales: proposal, contract_review, lead_qualification, deal_review, closing',
        'Financial: invoice_sent, payment_follow_up, payment_received',
        'Admin: document_review, reporting, planning, research, documentation'
    ]) as categories;