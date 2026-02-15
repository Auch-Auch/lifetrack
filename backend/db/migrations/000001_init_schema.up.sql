-- Consolidated migration - includes all schema changes
-- Original migrations: init_schema, add_reminders, fix_activity_status, learning_plan_dag, add_files

-- Create UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  telegram_id BIGINT UNIQUE,
  password_hash VARCHAR(255),
  is_service BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_service_account 
    CHECK (
      (is_service = TRUE AND password_hash IS NULL) OR 
      (is_service = FALSE AND password_hash IS NOT NULL)
    )
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_is_service ON users(is_service);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Skills table
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  level VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skills_user_id ON skills(user_id);

-- Activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  duration INT NOT NULL, -- minutes
  date DATE NOT NULL,
  notes TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('COMPLETED', 'ACTIVE', 'PAUSED')),
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  paused_duration BIGINT, -- milliseconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_skill_id ON activities(skill_id);
CREATE INDEX idx_activities_date ON activities(date);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_created_at ON activities(created_at);

-- Learning Plans table
CREATE TABLE learning_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  skill_ids UUID[] NOT NULL,
  schedule JSONB NOT NULL,
  target_hours_per_week DECIMAL(5,2),
  start_date DATE NOT NULL,
  end_date DATE,
  completed_hours DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_learning_plans_user_id ON learning_plans(user_id);
CREATE INDEX idx_learning_plans_start_date ON learning_plans(start_date);
CREATE INDEX idx_learning_plans_end_date ON learning_plans(end_date);

-- Learning plan nodes table for DAG structure
CREATE TABLE learning_plan_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learning_plan_id UUID NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  planned_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  completed_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  position_x DECIMAL(10,2) DEFAULT 0,
  position_y DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_learning_plan_nodes_plan_id ON learning_plan_nodes(learning_plan_id);
CREATE INDEX idx_learning_plan_nodes_skill_id ON learning_plan_nodes(skill_id);

-- Learning plan edges table for DAG dependencies
CREATE TABLE learning_plan_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learning_plan_id UUID NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES learning_plan_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES learning_plan_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_node_id, target_node_id)
);

CREATE INDEX idx_learning_plan_edges_plan_id ON learning_plan_edges(learning_plan_id);
CREATE INDEX idx_learning_plan_edges_source ON learning_plan_edges(source_node_id);
CREATE INDEX idx_learning_plan_edges_target ON learning_plan_edges(target_node_id);

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('activity', 'learning', 'meeting', 'reminder', 'custom')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  recurrence VARCHAR(50) DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly', 'custom')),
  recurrence_rule TEXT,
  recurrence_end TIMESTAMPTZ,
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  learning_plan_id UUID REFERENCES learning_plans(id) ON DELETE SET NULL,
  notifications JSONB,
  color VARCHAR(20),
  location TEXT,
  attendees TEXT[],
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_end_time ON events(end_time);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_skill_id ON events(skill_id);
CREATE INDEX idx_events_tags ON events USING GIN(tags);

-- Reminders table
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

-- Notes table with full-text search
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  linked_type VARCHAR(50) CHECK (linked_type IN ('skill', 'activity', 'event', 'learning_plan')),
  linked_id UUID,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_search_vector ON notes USING GIN(search_vector);
CREATE INDEX idx_notes_tags ON notes USING GIN(tags);
CREATE INDEX idx_notes_linked ON notes(linked_type, linked_id);
CREATE INDEX idx_notes_created_at ON notes(created_at);

-- Notifications queue table (supports both events and reminders)
CREATE TABLE notifications_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES reminders(id) ON DELETE CASCADE,
  notification_type VARCHAR(20) DEFAULT 'event' CHECK (notification_type IN ('event', 'reminder')),
  scheduled_time TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('browser', 'telegram')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_notification_source 
    CHECK (
      (event_id IS NOT NULL AND reminder_id IS NULL) OR
      (event_id IS NULL AND reminder_id IS NOT NULL)
    )
);

CREATE INDEX idx_notifications_scheduled ON notifications_queue(scheduled_time) WHERE NOT sent;
CREATE INDEX idx_notifications_user_id ON notifications_queue(user_id);
CREATE INDEX idx_notifications_event_id ON notifications_queue(event_id);
CREATE INDEX idx_notifications_reminder_id ON notifications_queue(reminder_id);

-- Files table for hybrid file system
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- File metadata
    filename VARCHAR(255) NOT NULL,
    directory VARCHAR(512) NOT NULL DEFAULT '/',
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    
    -- Telegram metadata
    telegram_file_id VARCHAR(255),
    telegram_file_unique_id VARCHAR(255),
    telegram_message_id BIGINT,
    
    -- Storage
    storage_path VARCHAR(1024) NOT NULL, -- Path on local file system
    
    -- Organization
    tags TEXT[],
    description TEXT,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT unique_storage_path UNIQUE(storage_path)
);

CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_directory ON files(user_id, directory);
CREATE INDEX idx_files_telegram_file_id ON files(telegram_file_id);
CREATE INDEX idx_files_created_at ON files(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_plans_updated_at BEFORE UPDATE ON learning_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_plan_nodes_updated_at BEFORE UPDATE ON learning_plan_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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

-- Comments
COMMENT ON TABLE files IS 'Stores metadata for user files in hybrid cloud/on-premises storage';
COMMENT ON COLUMN files.storage_path IS 'Relative path to file in on-premises storage';
COMMENT ON COLUMN files.telegram_file_id IS 'Telegram file_id for re-uploading (deleted if file removed from Telegram)';
COMMENT ON COLUMN files.directory IS 'Virtual directory path for file organization';
