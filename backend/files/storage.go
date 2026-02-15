package files

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// Config holds file storage configuration
type Config struct {
	StorageRoot string // Root directory for file storage
}

// Storage handles file system operations for hybrid storage
type Storage struct {
	config Config
}

// NewStorage creates a new Storage instance
func NewStorage(config Config) (*Storage, error) {
	// Create storage root if it doesn't exist
	if err := os.MkdirAll(config.StorageRoot, 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage root: %w", err)
	}
	
	return &Storage{
		config: config,
	}, nil
}

// SaveFile saves a file to the storage system
func (s *Storage) SaveFile(reader io.Reader, relativePath string) error {
	fullPath := filepath.Join(s.config.StorageRoot, relativePath)
	
	// Create parent directory if needed
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}
	
	// Create file
	file, err := os.Create(fullPath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()
	
	// Copy data
	_, err = io.Copy(file, reader)
	if err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}
	
	return nil
}

// GetFile returns a reader for the specified file
func (s *Storage) GetFile(relativePath string) (io.ReadCloser, error) {
	fullPath := filepath.Join(s.config.StorageRoot, relativePath)
	
	// Security check: ensure path is within storage root
	if !strings.HasPrefix(filepath.Clean(fullPath), filepath.Clean(s.config.StorageRoot)) {
		return nil, fmt.Errorf("invalid path: attempted path traversal")
	}
	
	file, err := os.Open(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	
	return file, nil
}

// DeleteFile removes a file from storage
func (s *Storage) DeleteFile(relativePath string) error {
	fullPath := filepath.Join(s.config.StorageRoot, relativePath)
	
	// Security check
	if !strings.HasPrefix(filepath.Clean(fullPath), filepath.Clean(s.config.StorageRoot)) {
		return fmt.Errorf("invalid path: attempted path traversal")
	}
	
	if err := os.Remove(fullPath); err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}
	
	return nil
}

// CreateDirectory creates a directory in the storage system
func (s *Storage) CreateDirectory(relativePath string) error {
	fullPath := filepath.Join(s.config.StorageRoot, relativePath)
	
	// Security check
	if !strings.HasPrefix(filepath.Clean(fullPath), filepath.Clean(s.config.StorageRoot)) {
		return fmt.Errorf("invalid path: attempted path traversal")
	}
	
	if err := os.MkdirAll(fullPath, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}
	
	return nil
}

// DeleteDirectory removes a directory from storage
func (s *Storage) DeleteDirectory(relativePath string, recursive bool) error {
	fullPath := filepath.Join(s.config.StorageRoot, relativePath)
	
	// Security check
	if !strings.HasPrefix(filepath.Clean(fullPath), filepath.Clean(s.config.StorageRoot)) {
		return fmt.Errorf("invalid path: attempted path traversal")
	}
	
	if recursive {
		if err := os.RemoveAll(fullPath); err != nil {
			return fmt.Errorf("failed to delete directory: %w", err)
		}
	} else {
		if err := os.Remove(fullPath); err != nil {
			return fmt.Errorf("failed to delete directory: %w", err)
		}
	}
	
	return nil
}

// CheckExists checks if a file or directory exists
func (s *Storage) CheckExists(relativePath string) (bool, error) {
	fullPath := filepath.Join(s.config.StorageRoot, relativePath)
	
	// Security check
	if !strings.HasPrefix(filepath.Clean(fullPath), filepath.Clean(s.config.StorageRoot)) {
		return false, fmt.Errorf("invalid path: attempted path traversal")
	}
	
	_, err := os.Stat(fullPath)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

// GetFileInfo returns file information
func (s *Storage) GetFileInfo(relativePath string) (os.FileInfo, error) {
	fullPath := filepath.Join(s.config.StorageRoot, relativePath)
	
	// Security check
	if !strings.HasPrefix(filepath.Clean(fullPath), filepath.Clean(s.config.StorageRoot)) {
		return nil, fmt.Errorf("invalid path: attempted path traversal")
	}
	
	info, err := os.Stat(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to get file info: %w", err)
	}
	
	return info, nil
}

// ListDirectory lists files and subdirectories in a directory
func (s *Storage) ListDirectory(relativePath string) ([]os.FileInfo, error) {
	fullPath := filepath.Join(s.config.StorageRoot, relativePath)
	
	// Security check
	if !strings.HasPrefix(filepath.Clean(fullPath), filepath.Clean(s.config.StorageRoot)) {
		return nil, fmt.Errorf("invalid path: attempted path traversal")
	}
	
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to list directory: %w", err)
	}
	
	infos := make([]os.FileInfo, 0, len(entries))
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}
		infos = append(infos, info)
	}
	
	return infos, nil
}
