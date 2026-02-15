-- Add directories table to support empty folders

CREATE TABLE IF NOT EXISTS directories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    path VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique paths per user
    CONSTRAINT unique_user_directory UNIQUE(user_id, path)
);

CREATE INDEX idx_directories_user_id ON directories(user_id);
CREATE INDEX idx_directories_path ON directories(user_id, path);
CREATE INDEX idx_directories_created_at ON directories(created_at);

-- Add trigger for updated_at
CREATE TRIGGER update_directories_updated_at
    BEFORE UPDATE ON directories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE directories IS 'Stores user-created directories (including empty ones) for file organization';
COMMENT ON COLUMN directories.path IS 'Full path of the directory (e.g., /documents/work)';
