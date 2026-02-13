-- Create reminders table
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_time TIMESTAMPTZ NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  repeat_pattern VARCHAR(50) DEFAULT 'none' CHECK (repeat_pattern IN ('none', 'daily', 'weekly', 'monthly', 'yearly', 'custom')),
  repeat_rule TEXT, -- For custom repeat patterns (iCal format)
  repeat_end TIMESTAMPTZ, -- When to stop repeating
  event_id UUID REFERENCES events(id) ON DELETE SET NULL, -- Optional link to event
  notification_channels TEXT[] DEFAULT '{"browser"}', -- browser, telegram, email
  reminder_times INT[] DEFAULT '{0}', -- Minutes before due_time to send notifications (0 = at due time)
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_due_time ON reminders(due_time);
CREATE INDEX idx_reminders_completed ON reminders(completed);
CREATE INDEX idx_reminders_event_id ON reminders(event_id);
CREATE INDEX idx_reminders_tags ON reminders USING GIN(tags);

-- Update notifications_queue to support both events and reminders
ALTER TABLE notifications_queue 
  ALTER COLUMN event_id DROP NOT NULL,
  ADD COLUMN reminder_id UUID REFERENCES reminders(id) ON DELETE CASCADE,
  ADD COLUMN notification_type VARCHAR(20) DEFAULT 'event' CHECK (notification_type IN ('event', 'reminder')),
  ADD COLUMN message TEXT,
  DROP CONSTRAINT IF EXISTS notifications_queue_event_id_fkey;

-- Re-add the foreign key without NOT NULL
ALTER TABLE notifications_queue 
  ADD CONSTRAINT notifications_queue_event_id_fkey 
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- Add constraint to ensure either event_id or reminder_id is set
ALTER TABLE notifications_queue 
  ADD CONSTRAINT check_notification_source 
  CHECK (
    (event_id IS NOT NULL AND reminder_id IS NULL) OR
    (event_id IS NULL AND reminder_id IS NOT NULL)
  );

CREATE INDEX idx_notifications_reminder_id ON notifications_queue(reminder_id);

-- Add trigger for reminders updated_at
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for upcoming reminders (not completed, due in the future)
CREATE OR REPLACE VIEW upcoming_reminders AS
SELECT 
  r.*,
  e.title as event_title
FROM reminders r
LEFT JOIN events e ON r.event_id = e.id
WHERE r.completed = FALSE 
  AND r.due_time > NOW()
ORDER BY r.due_time ASC;
