-- Migration: Standardize channel/source names to proper case
-- Run this in your Supabase SQL editor to fix duplicate channel entries

BEGIN;

-- Update deals table - standardize channel names
UPDATE deals 
SET channel = 'Website' 
WHERE channel = 'website';

UPDATE deals 
SET channel = 'Referral' 
WHERE channel = 'referral';

UPDATE deals 
SET channel = 'Organic Search' 
WHERE channel = 'organic search';

UPDATE deals 
SET channel = 'Email Marketing' 
WHERE channel = 'email marketing';

UPDATE deals 
SET channel = 'Social Media' 
WHERE channel = 'social media';

UPDATE deals 
SET channel = 'Advertising' 
WHERE channel = 'advertising';

UPDATE deals 
SET channel = 'Cold Call' 
WHERE channel = 'cold call';

UPDATE deals 
SET channel = 'LinkedIn' 
WHERE channel = 'linkedin';

UPDATE deals 
SET channel = 'Partner' 
WHERE channel = 'partner';

-- Update leads table - standardize source names  
UPDATE leads 
SET source = 'Website' 
WHERE source = 'website';

UPDATE leads 
SET source = 'Referral' 
WHERE source = 'referral';

UPDATE leads 
SET source = 'Organic Search' 
WHERE source = 'organic search';

UPDATE leads 
SET source = 'Email Marketing' 
WHERE source = 'email marketing';

UPDATE leads 
SET source = 'Social Media' 
WHERE source = 'social media';

UPDATE leads 
SET source = 'Advertising' 
WHERE source = 'advertising';

UPDATE leads 
SET source = 'Cold Call' 
WHERE source = 'cold call';

UPDATE leads 
SET source = 'LinkedIn' 
WHERE source = 'linkedin';

UPDATE leads 
SET source = 'Partner' 
WHERE source = 'partner';

COMMIT;