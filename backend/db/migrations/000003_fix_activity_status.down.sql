-- Revert status values to lowercase
UPDATE activities SET status = LOWER(status);

-- Drop the uppercase constraint
ALTER TABLE activities DROP CONSTRAINT activities_status_check;

-- Add back the lowercase constraint
ALTER TABLE activities ADD CONSTRAINT activities_status_check 
  CHECK (status IN ('completed', 'active', 'paused'));
