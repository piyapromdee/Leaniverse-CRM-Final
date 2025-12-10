-- Verification Script: Check RLS policies for contacts and companies tables
-- Run this BEFORE and AFTER applying the migration to verify the fix

-- 1. Check current RLS policies for contacts and companies tables
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd as operation,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename IN ('contacts', 'companies')
ORDER BY tablename, policyname;

-- 2. Check if RLS is enabled on these tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('contacts', 'companies')
AND schemaname = 'public';

-- 3. Test INSERT permissions (run as authenticated user)
-- Note: This would need to be run in the context of an authenticated session
-- INSERT INTO contacts (name, email) VALUES ('Test Contact', 'test@example.com');
-- INSERT INTO companies (name) VALUES ('Test Company');

-- 4. Check table structure to ensure compatibility
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('contacts', 'companies')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;