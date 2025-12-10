-- Migration: Fix INSERT RLS policies for contacts and companies tables
-- Date: 2025-01-20
-- Purpose: Allow authenticated users to INSERT new contacts and companies
-- Issue: Users cannot create new Contact or Company records due to missing INSERT policies

-- Policy สำหรับตาราง Contacts
-- Enable INSERT for authenticated users on contacts table
CREATE POLICY "Enable insert for authenticated users on contacts"
ON public.contacts FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy สำหรับตาราง Companies  
-- Enable INSERT for authenticated users on companies table
CREATE POLICY "Enable insert for authenticated users on companies"
ON public.companies FOR INSERT
TO authenticated
WITH CHECK (true);

-- Optional: Check existing policies (for verification)
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename IN ('contacts', 'companies')
-- ORDER BY tablename, policyname;