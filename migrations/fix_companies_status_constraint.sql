-- Fix companies status constraint
-- This script helps identify and fix the status constraint issue

-- 1. First, let's see what the current constraint allows
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc
    ON cc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'companies'
AND tc.table_schema = 'public'
AND cc.check_clause LIKE '%status%';

-- 2. Check current companies and their status values
SELECT 
    name,
    status,
    COUNT(*) as count
FROM companies 
GROUP BY status
ORDER BY status;

-- 3. If the constraint needs to be updated to allow 'Active', 'Lead', 'Inactive'
-- First drop the old constraint (replace 'companies_status_check' with actual name if different)
-- ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_status_check;

-- 4. Add new constraint with correct values
-- ALTER TABLE companies 
-- ADD CONSTRAINT companies_status_check 
-- CHECK (status IN ('Active', 'Lead', 'Inactive'));

-- 5. Alternative: If you want to allow the old values as well for backward compatibility
-- ALTER TABLE companies 
-- ADD CONSTRAINT companies_status_check 
-- CHECK (status IN ('Active', 'Lead', 'Inactive', 'Prospect', 'Active Customer'));

-- 6. Test the constraint with a sample insert (comment out to avoid actual insert)
-- INSERT INTO companies (name, status) VALUES ('Test Company', 'Active');
-- INSERT INTO companies (name, status) VALUES ('Test Company 2', 'Lead');
-- INSERT INTO companies (name, status) VALUES ('Test Company 3', 'Inactive');