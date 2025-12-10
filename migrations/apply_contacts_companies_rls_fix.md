# Fix for Save Functionality Bug - RLS Policies

## Problem Description
Users cannot create new Contact or Company records because the database lacks INSERT permissions for authenticated users due to missing Row-Level Security (RLS) policies.

## Root Cause
Supabase RLS is blocking INSERT operations on `contacts` and `companies` tables for authenticated users because no INSERT policies exist.

## Solution
Create RLS policies that allow authenticated users to INSERT new records into both tables.

## Steps to Apply the Fix

### 1. Verify Current State (Optional)
First, run the verification script to check existing policies:
```sql
-- Run this in Supabase SQL Editor
\i migrations/verify_contacts_companies_rls.sql
```

### 2. Apply the Migration
Run the main migration script in Supabase SQL Editor:
```sql
-- Run this in Supabase SQL Editor  
\i migrations/fix_contacts_companies_insert_rls.sql
```

### 3. Verify the Fix
Run the verification script again to confirm policies were created:
```sql
-- Run this in Supabase SQL Editor
\i migrations/verify_contacts_companies_rls.sql
```

### 4. Test in Application
1. Go to Dashboard → Contacts
2. Click "Add New Contact" 
3. Fill in required fields and click "Create"
4. Verify the contact is saved successfully

5. Go to Dashboard → Contacts  
6. Click "Add New Company"
7. Fill in required fields and click "Create"
8. Verify the company is saved successfully

## Expected Results After Fix
- ✅ Users can create new contacts
- ✅ Users can create new companies  
- ✅ Data is properly saved to the database
- ✅ No more RLS permission errors

## Rollback (If Needed)
If you need to remove these policies:
```sql
DROP POLICY IF EXISTS "Enable insert for authenticated users on contacts" ON public.contacts;
DROP POLICY IF EXISTS "Enable insert for authenticated users on companies" ON public.companies;
```

## Security Notes
- The policies use `WITH CHECK (true)` which allows any authenticated user to insert records
- This is appropriate for a CRM system where authenticated users should be able to create contacts/companies
- Consider adding more restrictive policies later if needed (e.g., user-specific or role-based restrictions)