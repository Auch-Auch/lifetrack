-- Revert directories table

DROP TRIGGER IF EXISTS update_directories_updated_at ON directories;
DROP TABLE IF EXISTS directories;
