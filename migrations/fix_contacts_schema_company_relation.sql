-- Migration: Fix contacts table schema to use proper foreign key relationship with companies
-- Date: 2025-01-20
-- Purpose: Add company_id foreign key column to contacts table instead of text company field
-- Issue: Database error "Could not find the 'company' column of 'contacts'"

-- Step 1: Add company_id column as foreign key to companies table
ALTER TABLE public.contacts
ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Step 2: Create index for better performance on company_id lookups
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts(company_id);

-- Step 3: Update existing contacts that have company names to link to company_id (if company column exists)
-- Note: This will only work if there's already a 'company' text column with company names
-- If the column doesn't exist, this will be skipped
DO $$ 
BEGIN
    -- Check if 'company' column exists before trying to update
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'company' 
        AND table_schema = 'public'
    ) THEN
        -- Update contacts to set company_id based on company name matches
        UPDATE public.contacts 
        SET company_id = companies.id
        FROM public.companies
        WHERE contacts.company = companies.name;
        
        -- Drop the old company text column after migration
        ALTER TABLE public.contacts DROP COLUMN IF EXISTS company;
    END IF;
END $$;

-- Step 4: Optional verification query (comment out when running)
-- SELECT 
--     c.id,
--     c.name as contact_name,
--     c.email,
--     c.company_id,
--     comp.name as company_name
-- FROM contacts c
-- LEFT JOIN companies comp ON c.company_id = comp.id
-- ORDER BY c.created_at DESC;