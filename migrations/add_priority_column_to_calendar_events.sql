-- Migration: Add 'priority' column to calendar_events table
-- Date: 2025-01-20
-- Purpose: Fix Error 42703: undefined_column for 'priority' field

-- เพิ่มคอลัมน์ 'priority' สำหรับเก็บระดับความสำคัญของ event เช่น 'High', 'Medium', 'Low'
ALTER TABLE public.calendar_events
ADD COLUMN priority TEXT;

-- เพิ่ม comment อธิบายคอลัมน์
COMMENT ON COLUMN public.calendar_events.priority IS 'ระดับความสำคัญของ calendar event เช่น High, Medium, Low';

-- ตั้งค่าข้อมูลเริ่มต้นสำหรับ records ที่มีอยู่แล้ว (optional)
UPDATE public.calendar_events 
SET priority = 'Medium' 
WHERE priority IS NULL;

-- เพิ่ม constraint เพื่อจำกัดค่าที่อนุญาต (optional, for data integrity)
ALTER TABLE public.calendar_events 
ADD CONSTRAINT check_priority_values 
CHECK (priority IN ('High', 'Medium', 'Low'));