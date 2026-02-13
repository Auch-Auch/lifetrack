-- Drop triggers
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP TRIGGER IF EXISTS update_learning_plans_updated_at ON learning_plans;
DROP TRIGGER IF EXISTS update_skills_updated_at ON skills;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS notifications_queue;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS learning_plans;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS users;

-- Drop extension
DROP EXTENSION IF EXISTS "uuid-ossp";
