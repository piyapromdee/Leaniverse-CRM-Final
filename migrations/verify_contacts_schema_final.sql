-- Final verification script for contacts table schema
-- Run this to ensure the schema is correct before testing the frontend

-- 1. Check if contacts table exists and has correct structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if companies table exists
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check foreign key relationships
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='contacts'
AND tc.table_schema='public';

-- 4. Check RLS policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('contacts', 'companies')
ORDER BY tablename, policyname;

-- 5. Test INSERT permission (commented out - uncomment to test)
-- INSERT INTO contacts (name, email, company_id) 
-- VALUES ('Test Contact', 'test@example.com', NULL);

-- 6. Test SELECT with JOIN (commented out - uncomment to test)
-- SELECT 
--     c.id,
--     c.name,
--     c.email,
--     c.company_id,
--     comp.name as company_name
-- FROM contacts c
-- LEFT JOIN companies comp ON c.company_id = comp.id
-- LIMIT 5;