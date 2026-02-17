-- Consolidated rollback migration - removes all schema changes
-- Original migrations (in reverse order): add_files, learning_plan_dag, fix_activity_status, add_reminders, init_schema

-- Drop view
DROP VIEW IF EXISTS upcoming_reminders;

-- Drop directories table
DROP TRIGGER IF EXISTS update_directories_updated_at ON directories;
DROP TABLE IF EXISTS directories;

-- Drop files table
DROP TRIGGER IF EXISTS update_files_updated_at ON files;
DROP INDEX IF EXISTS idx_files_created_at;
DROP INDEX IF EXISTS idx_files_telegram_file_id;
DROP INDEX IF EXISTS idx_files_directory;
DROP INDEX IF EXISTS idx_files_user_id;
DROP TABLE IF EXISTS files;

-- Drop learning plan DAG tables
DROP TRIGGER IF EXISTS update_learning_plan_nodes_updated_at ON learning_plan_nodes;
DROP TABLE IF EXISTS learning_plan_edges;
DROP TABLE IF EXISTS learning_plan_nodes;

-- Drop reminders table and related triggers
DROP TRIGGER IF EXISTS update_reminders_updated_at ON reminders;
DROP TABLE IF EXISTS reminders CASCADE;

-- Drop other triggers
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
