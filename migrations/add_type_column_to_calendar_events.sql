-- Migration: Add 'type' column to calendar_events table
-- Date: 2025-01-20
-- Purpose: Fix Schema Error "undefined_column" (Error 42703)

-- เพิ่มคอลัมน์ 'type' สำหรับเก็บประเภทของ event เช่น 'Meeting', 'Call', 'Demo'
ALTER TABLE public.calendar_events
ADD COLUMN type TEXT;

-- เพิ่ม comment อธิบายคอลัมน์
COMMENT ON COLUMN public.calendar_events.type IS 'ประเภทของ calendar event เช่น Meeting, Call, Demo, Appointment';

-- ตั้งค่าข้อมูลเริ่มต้นสำหรับ records ที่มีอยู่แล้ว (optional)
UPDATE public.calendar_events 
SET type = 'Appointment' 
WHERE type IS NULL;

-- สร้าง index สำหรับการ query แบบ filter ตาม type (optional, สำหรับ performance)
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON public.calendar_events(type);