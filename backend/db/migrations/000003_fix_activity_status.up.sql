-- Drop the old check constraint
ALTER TABLE activities DROP CONSTRAINT activities_status_check;

-- Add new check constraint with uppercase values
ALTER TABLE activities ADD CONSTRAINT activities_status_check 
  CHECK (status IN ('COMPLETED', 'ACTIVE', 'PAUSED'));

-- Update existing records to uppercase
UPDATE activities SET status = UPPER(status);
