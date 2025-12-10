-- Migration: Reset RLS Policy for deals table
-- Date: 2025-01-20
-- Purpose: Drop existing restrictive policies and create more flexible ones

-- ลบ Policy เก่าทั้งหมดเพื่อเริ่มต้นใหม่
DROP POLICY IF EXISTS "Enable read access for authenticated users on deals" ON public.deals;
DROP POLICY IF EXISTS "Enable insert access for authenticated users on deals" ON public.deals;
DROP POLICY IF EXISTS "Enable update access for authenticated users on deals" ON public.deals;
DROP POLICY IF EXISTS "Enable delete access for authenticated users on deals" ON public.deals;

-- สร้าง Policy ใหม่ที่อนุญาตให้ผู้ใช้ที่ Login อยู่ทุกคนสามารถเข้าถึงข้อมูลได้ทั้งหมด
-- (เพื่อเป็นการทดสอบว่าปัญหาอยู่ที่ RLS Policy หรือไม่)

-- Policy สำหรับการอ่านข้อมูล (SELECT)
CREATE POLICY "Allow all authenticated users to read deals"
ON public.deals FOR SELECT
TO authenticated
USING (true);

-- Policy สำหรับการสร้างข้อมูล (INSERT)
CREATE POLICY "Allow all authenticated users to create deals"
ON public.deals FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy สำหรับการแก้ไขข้อมูล (UPDATE)
CREATE POLICY "Allow all authenticated users to update deals"
ON public.deals FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy สำหรับการลบข้อมูล (DELETE)
CREATE POLICY "Allow all authenticated users to delete deals"
ON public.deals FOR DELETE
TO authenticated
USING (true);

-- ตรวจสอบว่า RLS ถูกเปิดใช้งานสำหรับตาราง deals
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;