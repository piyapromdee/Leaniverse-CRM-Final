-- Fix Sales J user org_id issue
-- This script will ensure Sales J can see leads by setting the correct org_id

-- Step 1: Create a default organization if none exists
INSERT INTO organizations (id, name, slug, plan, max_users, max_contacts)
VALUES (
  '8a6b275c-4265-4c46-a680-8cd4b78f14db',
  'Dummi & Co',
  'dummi-co',
  'enterprise',
  100,
  10000
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Update both admin and Sales J users to use the same org_id
UPDATE profiles 
SET org_id = '8a6b275c-4265-4c46-a680-8cd4b78f14db'
WHERE id IN (
  '1b0bfda8-d888-4ceb-8170-5cfc156f3277', -- piyapromdee@gmail.com (admin)
  'fff0197f-6492-4435-bc5e-672282ceef83'   -- deemmi.info@gmail.com (Sales J)
);

-- Step 3: Update all existing leads to use the same org_id if they're null
UPDATE leads 
SET org_id = '8a6b275c-4265-4c46-a680-8cd4b78f14db'
WHERE org_id IS NULL;

-- Step 4: Update any other business records that might have null org_id
UPDATE companies 
SET org_id = '8a6b275c-4265-4c46-a680-8cd4b78f14db'
WHERE org_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies');

UPDATE contacts 
SET org_id = '8a6b275c-4265-4c46-a680-8cd4b78f14db'
WHERE org_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts');

UPDATE deals 
SET org_id = '8a6b275c-4265-4c46-a680-8cd4b78f14db'
WHERE org_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deals');

UPDATE calendar_events 
SET org_id = '8a6b275c-4265-4c46-a680-8cd4b78f14db'
WHERE org_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events');

UPDATE activity_logs 
SET org_id = '8a6b275c-4265-4c46-a680-8cd4b78f14db'
WHERE org_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs');

-- Step 5: Verify the changes
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.role,
  p.org_id,
  o.name as org_name
FROM profiles p
LEFT JOIN organizations o ON p.org_id = o.id
WHERE p.id IN (
  '1b0bfda8-d888-4ceb-8170-5cfc156f3277',
  'fff0197f-6492-4435-bc5e-672282ceef83'
);