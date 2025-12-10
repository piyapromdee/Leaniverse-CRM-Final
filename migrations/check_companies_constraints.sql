-- Check companies table constraints and schema
-- This will help identify the exact constraint that's failing

-- 1. Check companies table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check all constraints on companies table
SELECT
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    kcu.column_name,
    cc.check_clause
FROM 
    information_schema.table_constraints AS tc
    LEFT JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.check_constraints AS cc
        ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'companies'
AND tc.table_schema = 'public';

-- 3. Check specifically for status column constraints
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc
    ON cc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'companies'
AND tc.table_schema = 'public'
AND cc.check_clause LIKE '%status%';

-- 4. Check if there are any enum types for status
SELECT 
    t.typname,
    e.enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE '%status%'
ORDER BY t.typname, e.enumsortorder;