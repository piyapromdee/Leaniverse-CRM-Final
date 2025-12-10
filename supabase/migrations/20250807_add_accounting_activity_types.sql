-- Add billing, invoice, and document/accounting activity types to calendar_events
-- Run this in your Supabase SQL editor

-- STEP 1: Drop the current constraint
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_type_check;

-- STEP 2: Add comprehensive constraint including new accounting/billing types
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_type_check 
    CHECK (type IN (
        -- Core calendar types
        'task',
        'appointment', 
        'meeting',
        'call',
        
        -- CRM activity types  
        'site_visit',
        'traveling',
        'email',
        'follow_up',
        'presentation',
        'negotiation',
        'proposal',
        'demo',
        'training',
        
        -- Sales activity types
        'lead_qualification',
        'deal_review', 
        'contract_review',
        'closing',
        
        -- Administrative types
        'planning',
        'research',
        'documentation',
        'reporting',
        
        -- NEW: Billing & Invoice types
        'billing',
        'invoice_creation',
        'invoice_review',
        'invoice_sent',
        'payment_follow_up',
        'payment_received',
        'billing_inquiry',
        'payment_reminder',
        
        -- NEW: Document & Accounting types
        'document_review',
        'document_preparation',
        'document_filing',
        'accounting_entry',
        'expense_report',
        'financial_review',
        'audit_preparation',
        'tax_preparation',
        'bookkeeping',
        'receipt_processing',
        'expense_approval',
        'budget_review',
        
        -- Generic fallbacks
        'activity',
        'event',
        'other'
    ));

-- STEP 3: Update any existing invalid types to 'activity'
UPDATE calendar_events 
SET type = 'activity' 
WHERE type NOT IN (
    'task', 'appointment', 'meeting', 'call',
    'site_visit', 'traveling', 'email', 'follow_up',
    'presentation', 'negotiation', 'proposal', 'demo',
    'training', 'lead_qualification', 'deal_review',
    'contract_review', 'closing', 'planning', 'research',
    'documentation', 'reporting', 
    'billing', 'invoice_creation', 'invoice_review', 'invoice_sent',
    'payment_follow_up', 'payment_received', 'billing_inquiry', 'payment_reminder',
    'document_review', 'document_preparation', 'document_filing', 
    'accounting_entry', 'expense_report', 'financial_review',
    'audit_preparation', 'tax_preparation', 'bookkeeping',
    'receipt_processing', 'expense_approval', 'budget_review',
    'activity', 'event', 'other'
);

-- STEP 4: Verify the constraint works
DO $$
BEGIN
    -- Test the constraint with new billing type
    INSERT INTO calendar_events (user_id, title, type, date) 
    VALUES (auth.uid(), 'Test Invoice Creation', 'invoice_creation', CURRENT_DATE);
    
    -- Test with new document type
    INSERT INTO calendar_events (user_id, title, type, date) 
    VALUES (auth.uid(), 'Test Document Review', 'document_review', CURRENT_DATE);
    
    -- Delete the test records
    DELETE FROM calendar_events WHERE title IN ('Test Invoice Creation', 'Test Document Review');
    
    RAISE NOTICE '✅ ACCOUNTING ACTIVITY TYPES ADDED SUCCESSFULLY!';
    RAISE NOTICE '✅ calendar_events now supports billing, invoice, and document types!';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Error during test: %', SQLERRM;
END $$;

-- STEP 5: Show new accounting/billing types added
SELECT 
    'New accounting activity types added:' as info,
    unnest(ARRAY[
        'billing', 'invoice_creation', 'invoice_review', 'invoice_sent',
        'payment_follow_up', 'payment_received', 'billing_inquiry', 'payment_reminder',
        'document_review', 'document_preparation', 'document_filing', 
        'accounting_entry', 'expense_report', 'financial_review',
        'audit_preparation', 'tax_preparation', 'bookkeeping',
        'receipt_processing', 'expense_approval', 'budget_review'
    ]) as new_types;