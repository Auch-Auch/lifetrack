-- Drop view
DROP VIEW IF EXISTS upcoming_reminders;

-- Drop trigger
DROP TRIGGER IF EXISTS update_reminders_updated_at ON reminders;

-- Remove constraints and columns from notifications_queue
ALTER TABLE notifications_queue 
  DROP CONSTRAINT IF EXISTS check_notification_source,
  DROP COLUMN IF EXISTS reminder_id,
  DROP COLUMN IF EXISTS notification_type,
  DROP COLUMN IF EXISTS message;

-- Restore event_id as NOT NULL (need to handle existing null values first)
DELETE FROM notifications_queue WHERE event_id IS NULL;
ALTER TABLE notifications_queue 
  ALTER COLUMN event_id SET NOT NULL;

-- Drop reminders table
DROP TABLE IF EXISTS reminders CASCADE;
