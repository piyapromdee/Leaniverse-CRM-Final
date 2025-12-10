-- Migration: Fix RLS Policy for deals table
-- Date: 2025-01-20
-- Purpose: Allow authenticated users to read deals data

-- แก้ไข RLS Policy สำหรับตาราง deals เพื่อให้ผู้ใช้ที่ Login แล้วสามารถอ่านข้อมูลได้
CREATE POLICY "Enable read access for authenticated users on deals"
ON public.deals FOR SELECT
TO authenticated
USING (true);

-- สำหรับการ INSERT (สร้าง deal ใหม่)
CREATE POLICY "Enable insert access for authenticated users on deals"
ON public.deals FOR INSERT
TO authenticated
WITH CHECK (true);

-- สำหรับการ UPDATE (แก้ไข deal)
CREATE POLICY "Enable update access for authenticated users on deals"
ON public.deals FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- สำหรับการ DELETE (ลบ deal)
CREATE POLICY "Enable delete access for authenticated users on deals"
ON public.deals FOR DELETE
TO authenticated
USING (true);

-- ตรวจสอบว่า RLS ถูกเปิดใช้งานสำหรับตาราง deals
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;