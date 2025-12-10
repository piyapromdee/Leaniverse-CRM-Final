-- Add commission_rate and kpi_metrics columns to profiles table
-- These columns store KPI configuration data for each sales team member

-- Add commission_rate as a numeric column (percentage value, e.g., 5 for 5%)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0;

-- Add kpi_metrics JSONB column for structured KPI data
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS kpi_metrics JSONB DEFAULT NULL;

-- Add monthly_target column for individual monthly sales targets
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS monthly_target NUMERIC(12,2) DEFAULT 0;

-- Add comments to document the columns
COMMENT ON COLUMN profiles.commission_rate IS 'Commission rate percentage for the sales rep (e.g., 5.00 for 5%)';
COMMENT ON COLUMN profiles.monthly_target IS 'Monthly sales target in currency (e.g., 100000 for ฿100,000)';
COMMENT ON COLUMN profiles.kpi_metrics IS 'Stores additional KPI configuration as JSONB including calls_target, meetings_target, conversion_target, and time_period';

-- Create an index for faster queries on the JSONB column
CREATE INDEX IF NOT EXISTS idx_profiles_kpi_metrics ON profiles USING GIN (kpi_metrics);
