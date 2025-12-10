-- Streamlined CRM Activity Types - Replace previous comprehensive list
-- This migration updates the activity types to focus on essential CRM activities

-- STEP 1: Drop the current constraint
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_type_check;

-- STEP 2: Add streamlined constraint with essential CRM activity types
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_type_check 
    CHECK (type IN (
        -- Core calendar types
        'task',
        'appointment', 
        'meeting',
        'call',
        
        -- Essential CRM activity types  
        'site_visit',
        'traveling',
        'email',
        'follow_up',
        'presentation',
        'negotiation',
        'proposal',
        'demo',
        'consultation',
        
        -- Sales & Contract types
        'contract_review',
        'lead_qualification',
        'deal_review',
        'closing',
        
        -- Essential Financial types
        'invoice_sent',
        'payment_follow_up',
        'payment_received',
        
        -- Administrative types (essential only)
        'planning',
        'research',
        'documentation',
        'reporting',
        'document_review',
        
        -- Generic fallbacks
        'activity',
        'event',
        'other'
    ));

-- STEP 3: Update any existing removed types to appropriate alternatives
UPDATE calendar_events 
SET type = CASE 
    -- Map removed billing types to appropriate alternatives
    WHEN type = 'billing' THEN 'invoice_sent'
    WHEN type = 'invoice_creation' THEN 'invoice_sent'
    WHEN type = 'invoice_review' THEN 'document_review'
    WHEN type = 'billing_inquiry' THEN 'follow_up'
    WHEN type = 'payment_reminder' THEN 'payment_follow_up'
    
    -- Map removed document types to document_review
    WHEN type IN ('document_preparation', 'document_filing', 'accounting_entry', 
                  'expense_report', 'financial_review', 'audit_preparation', 
                  'tax_preparation', 'bookkeeping', 'receipt_processing', 
                  'expense_approval', 'budget_review') THEN 'document_review'
    
    -- Keep existing valid types
    ELSE type
END
WHERE type IN (
    'billing', 'invoice_creation', 'invoice_review', 'billing_inquiry', 'payment_reminder',
    'document_preparation', 'document_filing', 'accounting_entry', 'expense_report',
    'financial_review', 'audit_preparation', 'tax_preparation', 'bookkeeping',
    'receipt_processing', 'expense_approval', 'budget_review'
);

-- STEP 4: Verify the constraint works
DO $$
BEGIN
    -- Test the constraint with essential financial type
    INSERT INTO calendar_events (user_id, title, type, date) 
    VALUES (auth.uid(), 'Test Invoice Sent', 'invoice_sent', CURRENT_DATE);
    
    -- Test with document review type
    INSERT INTO calendar_events (user_id, title, type, date) 
    VALUES (auth.uid(), 'Test Document Review', 'document_review', CURRENT_DATE);
    
    -- Delete the test records
    DELETE FROM calendar_events WHERE title IN ('Test Invoice Sent', 'Test Document Review');
    
    RAISE NOTICE '✅ STREAMLINED ACTIVITY TYPES UPDATED SUCCESSFULLY!';
    RAISE NOTICE '✅ Focused on essential CRM activities for better efficiency!';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Error during test: %', SQLERRM;
END $$;

-- STEP 5: Show streamlined activity types
SELECT 
    'Essential CRM activity types now available:' as info,
    unnest(ARRAY[
        -- Core CRM
        'meeting', 'call', 'email', 'follow_up', 'presentation', 'demo', 
        'negotiation', 'site_visit', 'consultation',
        -- Sales & Proposals  
        'proposal', 'contract_review', 'lead_qualification', 'deal_review', 'closing',
        -- Financial (essential)
        'invoice_sent', 'payment_follow_up', 'payment_received',
        -- Administrative (essential)
        'document_review', 'reporting', 'planning', 'research', 'documentation'
    ]) as essential_types;