package graph

import (
	"context"
	"database/sql"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/aleksandr/lifetrack/backend/auth"
	"github.com/aleksandr/lifetrack/backend/graph/model"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

// File Queries

// Files returns a paginated list of files for the current user
func (r *queryResolver) Files(ctx context.Context, filter *model.FileFilter, limit *int, offset *int) (*model.FileConnection, error) {
	currentUser, err := auth.GetUserFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("unauthorized")
	}

	limitVal := 50
	if limit != nil {
		limitVal = *limit
	}
	offsetVal := 0
	if offset != nil {
		offsetVal = *offset
	}

	// Build query with filters
	baseQuery := `FROM files WHERE user_id = $1`
	args := []interface{}{currentUser.ID}
	argCount := 1

	if filter != nil {
		if filter.Directory != nil {
			argCount++
			baseQuery += fmt.Sprintf(" AND directory = $%d", argCount)
			args = append(args, *filter.Directory)
		}
		if filter.MimeType != nil {
			argCount++
			baseQuery += fmt.Sprintf(" AND mime_type = $%d", argCount)
			args = append(args, *filter.MimeType)
		}
		if filter.SearchQuery != nil {
			argCount++
			baseQuery += fmt.Sprintf(" AND (filename ILIKE $%d OR description ILIKE $%d)", argCount, argCount)
			args = append(args, "%"+*filter.SearchQuery+"%")
		}
		if filter.Tags != nil && len(filter.Tags) > 0 {
			argCount++
			baseQuery += fmt.Sprintf(" AND tags && $%d", argCount)
			args = append(args, pq.Array(filter.Tags))
		}
	}

	// Count total
	countQuery := "SELECT COUNT(*) " + baseQuery
	var totalCount int
	err = r.DB.QueryRowContext(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to count files: %w", err)
	}
	if err == sql.ErrNoRows {
		totalCount = 0
	}

	// Build full query for fetching files
	query := `SELECT id, user_id, filename, directory, original_filename, mime_type, 
	          file_size, telegram_file_id, telegram_file_unique_id, telegram_message_id,
	          storage_path, tags, description, created_at, updated_at ` + baseQuery
	query += " ORDER BY created_at DESC"
	argCount++
	query += fmt.Sprintf(" LIMIT $%d", argCount)
	args = append(args, limitVal)
	argCount++
	query += fmt.Sprintf(" OFFSET $%d", argCount)
	args = append(args, offsetVal)

	rows, err := r.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query files: %w", err)
	}
	defer rows.Close()

	files := []*model.File{}
	for rows.Next() {
		file, err := scanFile(rows)
		if err != nil {
			return nil, err
		}
		files = append(files, file)
	}

	hasMore := (offsetVal + len(files)) < totalCount

	return &model.FileConnection{
		Nodes:      files,
		TotalCount: totalCount,
		HasMore:    hasMore,
	}, nil
}

// File returns a single file by ID
func (r *queryResolver) File(ctx context.Context, id uuid.UUID) (*model.File, error) {
	currentUser, err := auth.GetUserFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("unauthorized")
	}

	query := `SELECT id, user_id, filename, directory, original_filename, mime_type, 
	          file_size, telegram_file_id, telegram_file_unique_id, telegram_message_id,
	          storage_path, tags, description, created_at, updated_at
	          FROM files WHERE id = $1 AND user_id = $2`

	file, err := scanFile(r.DB.QueryRowContext(ctx, query, id, currentUser.ID))
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("file not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query file: %w", err)
	}

	return file, nil
}

// Directories returns a list of directories
func (r *queryResolver) Directories(ctx context.Context, parentPath *string) ([]*model.Directory, error) {
	currentUser, err := auth.GetUserFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("unauthorized")
	}

	parent := "/"
	if parentPath != nil {
		parent = *parentPath
	}

	// Collect all directories from both files and directories table
	dirMap := make(map[string]bool)
	
	// Get directories from files table
	filesQuery := `SELECT DISTINCT directory FROM files 
	               WHERE user_id = $1 AND directory LIKE $2 
	               ORDER BY directory`

	pattern := parent
	if !strings.HasSuffix(pattern, "/") {
		pattern += "/"
	}
	pattern += "%"

	rows, err := r.DB.QueryContext(ctx, filesQuery, currentUser.ID, pattern)
	if err != nil {
		return nil, fmt.Errorf("failed to query file directories: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var dir string
		if err := rows.Scan(&dir); err != nil {
			return nil, err
		}
		// Extract immediate subdirectory
		rel := strings.TrimPrefix(dir, parent)
		rel = strings.TrimPrefix(rel, "/")
		parts := strings.Split(rel, "/")
		if len(parts) > 0 && parts[0] != "" {
			subdir := filepath.Join(parent, parts[0])
			dirMap[subdir] = true
		}
	}
	
	// Get directories from directories table
	dirsQuery := `SELECT path FROM directories 
	              WHERE user_id = $1 AND path LIKE $2 
	              ORDER BY path`
	
	dirRows, err := r.DB.QueryContext(ctx, dirsQuery, currentUser.ID, pattern)
	if err != nil {
		return nil, fmt.Errorf("failed to query directories table: %w", err)
	}
	defer dirRows.Close()
	
	for dirRows.Next() {
		var dir string
		if err := dirRows.Scan(&dir); err != nil {
			return nil, err
		}
		// Extract immediate subdirectory
		rel := strings.TrimPrefix(dir, parent)
		rel = strings.TrimPrefix(rel, "/")
		parts := strings.Split(rel, "/")
		if len(parts) > 0 && parts[0] != "" {
			subdir := filepath.Join(parent, parts[0])
			dirMap[subdir] = true
		}
	}

	directories := []*model.Directory{}
	for dir := range dirMap {
		// Count files in this directory
		countQuery := `SELECT COUNT(*) FROM files WHERE user_id = $1 AND directory = $2`
		var fileCount int
		err := r.DB.QueryRowContext(ctx, countQuery, currentUser.ID, dir).Scan(&fileCount)
		if err != nil {
			fileCount = 0
		}

		// Get subdirectories (from both sources)
		subDirMap := make(map[string]bool)
		
		// From files
		subFilesQuery := `SELECT DISTINCT directory FROM files WHERE user_id = $1 AND directory LIKE $2`
		subPattern := dir
		if !strings.HasSuffix(subPattern, "/") {
			subPattern += "/"
		}
		subPattern += "%"

		subRows, err := r.DB.QueryContext(ctx, subFilesQuery, currentUser.ID, subPattern)
		if err == nil {
			defer subRows.Close()
			for subRows.Next() {
				var subDir string
				if err := subRows.Scan(&subDir); err == nil {
					rel := strings.TrimPrefix(subDir, dir)
					rel = strings.TrimPrefix(rel, "/")
					parts := strings.Split(rel, "/")
					if len(parts) > 0 && parts[0] != "" {
						subDirMap[parts[0]] = true
					}
				}
			}
		}
		
		// From directories table
		subDirsQuery := `SELECT path FROM directories WHERE user_id = $1 AND path LIKE $2`
		subDirRows, err := r.DB.QueryContext(ctx, subDirsQuery, currentUser.ID, subPattern)
		if err == nil {
			defer subDirRows.Close()
			for subDirRows.Next() {
				var subDir string
				if err := subDirRows.Scan(&subDir); err == nil {
					rel := strings.TrimPrefix(subDir, dir)
					rel = strings.TrimPrefix(rel, "/")
					parts := strings.Split(rel, "/")
					if len(parts) > 0 && parts[0] != "" {
						subDirMap[parts[0]] = true
					}
				}
			}
		}
		
		subdirs := []string{}
		for s := range subDirMap {
			subdirs = append(subdirs, s)
		}

		parentDir := parent
		if dir == "/" {
			parentDir = ""
		}

		directories = append(directories, &model.Directory{
			Path:            dir,
			Parent:          &parentDir,
			Subdirectories:  subdirs,
			FileCount:       fileCount,
		})
	}

	return directories, nil
}

// Directory returns information about a specific directory
func (r *queryResolver) Directory(ctx context.Context, path string) (*model.Directory, error) {
	currentUser, err := auth.GetUserFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("unauthorized")
	}

	// Count files in this directory
	countQuery := `SELECT COUNT(*) FROM files WHERE user_id = $1 AND directory = $2`
	var fileCount int
	err = r.DB.QueryRowContext(ctx, countQuery, currentUser.ID, path).Scan(&fileCount)
	if err != nil {
		fileCount = 0
	}

	// Get subdirectories
	subQuery := `SELECT DISTINCT directory FROM files WHERE user_id = $1 AND directory LIKE $2`
	pattern := path
	if !strings.HasSuffix(pattern, "/") {
		pattern += "/"
	}
	pattern += "%"

	rows, err := r.DB.QueryContext(ctx, subQuery, currentUser.ID, pattern)
	subdirs := []string{}
	if err == nil {
		defer rows.Close()
		subDirMap := make(map[string]bool)
		for rows.Next() {
			var dir string
			if err := rows.Scan(&dir); err == nil {
				rel := strings.TrimPrefix(dir, path)
				rel = strings.TrimPrefix(rel, "/")
				parts := strings.Split(rel, "/")
				if len(parts) > 0 && parts[0] != "" {
					subDirMap[parts[0]] = true
				}
			}
		}
		for s := range subDirMap {
			subdirs = append(subdirs, s)
		}
	}

	// Get parent directory
	parentDir := "/"
	if path != "/" {
		parentDir = filepath.Dir(path)
	}

	return &model.Directory{
		Path:            path,
		Parent:          &parentDir,
		Subdirectories:  subdirs,
		FileCount:       fileCount,
	}, nil
}

// File Mutations

// CreateFile creates a new file record
func (r *mutationResolver) CreateFile(ctx context.Context, input model.CreateFileInput) (*model.File, error) {
	currentUser, err := auth.GetUserFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("unauthorized")
	}

	query := `INSERT INTO files 
	          (user_id, filename, directory, original_filename, mime_type, file_size,
	           telegram_file_id, telegram_file_unique_id, telegram_message_id, storage_path, tags, description)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	          RETURNING id, user_id, filename, directory, original_filename, mime_type, 
	          file_size, telegram_file_id, telegram_file_unique_id, telegram_message_id,
	          storage_path, tags, description, created_at, updated_at`

	tags := []string{}
	if input.Tags != nil {
		tags = input.Tags
	}

	file, err := scanFile(r.DB.QueryRowContext(ctx, query,
		currentUser.ID,
		input.Filename,
		input.Directory,
		input.OriginalFilename,
		input.MimeType,
		input.FileSize,
		input.TelegramFileID,
		input.TelegramFileUniqueID,
		input.TelegramMessageID,
		input.StoragePath,
		pq.Array(tags),
		input.Description,
	))

	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}

	return file, nil
}

// UpdateFile updates file metadata
func (r *mutationResolver) UpdateFile(ctx context.Context, id uuid.UUID, input model.UpdateFileInput) (*model.File, error) {
	currentUser, err := auth.GetUserFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("unauthorized")
	}

	// Build dynamic update query
	updates := []string{}
	args := []interface{}{id, currentUser.ID}
	argCount := 2

	if input.Filename != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("filename = $%d", argCount))
		args = append(args, *input.Filename)
	}
	if input.Directory != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("directory = $%d", argCount))
		args = append(args, *input.Directory)
	}
	if input.Tags != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("tags = $%d", argCount))
		args = append(args, pq.Array(input.Tags))
	}
	if input.Description != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("description = $%d", argCount))
		args = append(args, *input.Description)
	}
	if input.TelegramFileID != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("telegram_file_id = $%d", argCount))
		args = append(args, *input.TelegramFileID)
	}

	if len(updates) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}

	updates = append(updates, "updated_at = NOW()")

	query := fmt.Sprintf(`UPDATE files SET %s WHERE id = $1 AND user_id = $2
	                      RETURNING id, user_id, filename, directory, original_filename, mime_type, 
	                      file_size, telegram_file_id, telegram_file_unique_id, telegram_message_id,
	                      storage_path, tags, description, created_at, updated_at`,
		strings.Join(updates, ", "))

	file, err := scanFile(r.DB.QueryRowContext(ctx, query, args...))
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("file not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update file: %w", err)
	}

	return file, nil
}

// DeleteFile deletes a file record
func (r *mutationResolver) DeleteFile(ctx context.Context, id uuid.UUID, removeFromStorage *bool) (bool, error) {
	currentUser, err := auth.GetUserFromContext(ctx)
	if err != nil {
		return false, fmt.Errorf("unauthorized")
	}

	// Get file info first if we need to delete from storage
	if removeFromStorage != nil && *removeFromStorage {
		var storagePath string
		err := r.DB.QueryRowContext(ctx,
			"SELECT storage_path FROM files WHERE id = $1 AND user_id = $2",
			id, currentUser.ID).Scan(&storagePath)
		if err != nil {
			return false, fmt.Errorf("file not found")
		}

		// Delete from storage (you'll need to implement this with your Storage instance)
		// For now, we'll just delete the DB record
	}

	query := `DELETE FROM files WHERE id = $1 AND user_id = $2`
	result, err := r.DB.ExecContext(ctx, query, id, currentUser.ID)
	if err != nil {
		return false, fmt.Errorf("failed to delete file: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("failed to check deletion: %w", err)
	}

	return rows > 0, nil
}

// CreateDirectory creates a new directory
func (r *mutationResolver) CreateDirectory(ctx context.Context, path string) (*model.Directory, error) {
	currentUser, err := auth.GetUserFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("unauthorized")
	}

	// Insert directory into directories table
	query := `INSERT INTO directories (user_id, path) VALUES ($1, $2) 
	          ON CONFLICT (user_id, path) DO NOTHING`
	_, err = r.DB.ExecContext(ctx, query, currentUser.ID, path)
	if err != nil {
		return nil, fmt.Errorf("failed to create directory: %w", err)
	}

	// Return the directory structure
	qr := queryResolver{r.Resolver}
	return qr.Directory(ctx, path)
}

// DeleteDirectory deletes a directory
func (r *mutationResolver) DeleteDirectory(ctx context.Context, path string, recursive *bool) (bool, error) {
	currentUser, err := auth.GetUserFromContext(ctx)
	if err != nil {
		return false, fmt.Errorf("unauthorized")
	}

	isRecursive := false
	if recursive != nil {
		isRecursive = *recursive
	}

	if isRecursive {
		// Delete all files in directory and subdirectories
		pattern := path
		if !strings.HasSuffix(pattern, "/") {
			pattern += "/"
		}
		pattern += "%"

		query := `DELETE FROM files WHERE user_id = $1 AND (directory = $2 OR directory LIKE $3)`
		_, err := r.DB.ExecContext(ctx, query, currentUser.ID, path, pattern)
		if err != nil {
			return false, fmt.Errorf("failed to delete directory files: %w", err)
		}
		
		// Delete directory entries
		dirQuery := `DELETE FROM directories WHERE user_id = $1 AND (path = $2 OR path LIKE $3)`
		_, err = r.DB.ExecContext(ctx, dirQuery, currentUser.ID, path, pattern)
		if err != nil {
			return false, fmt.Errorf("failed to delete directory entries: %w", err)
		}
	} else {
		// Only delete if empty (no files and no subdirectories)
		countQuery := `SELECT COUNT(*) FROM files WHERE user_id = $1 AND directory = $2`
		var count int
		err := r.DB.QueryRowContext(ctx, countQuery, currentUser.ID, path).Scan(&count)
		if err != nil {
			return false, fmt.Errorf("failed to check directory: %w", err)
		}

		if count > 0 {
			return false, fmt.Errorf("directory not empty")
		}
		
		// Check for subdirectories
		pattern := path
		if !strings.HasSuffix(pattern, "/") {
			pattern += "/"
		}
		pattern += "%"
		
		var subDirCount int
		subDirQuery := `SELECT COUNT(*) FROM directories WHERE user_id = $1 AND path LIKE $2 AND path != $3`
		err = r.DB.QueryRowContext(ctx, subDirQuery, currentUser.ID, pattern, path).Scan(&subDirCount)
		if err != nil {
			return false, fmt.Errorf("failed to check subdirectories: %w", err)
		}
		
		if subDirCount > 0 {
			return false, fmt.Errorf("directory has subdirectories")
		}
		
		// Delete empty directory
		dirQuery := `DELETE FROM directories WHERE user_id = $1 AND path = $2`
		_, err = r.DB.ExecContext(ctx, dirQuery, currentUser.ID, path)
		if err != nil {
			return false, fmt.Errorf("failed to delete directory entry: %w", err)
		}
	}

	return true, nil
}

// MoveFile moves a file to a different directory (logical path only)
// Note: This only changes the directory field in the database (virtual/logical path).
// The physical file location (storage_path) remains unchanged.
func (r *mutationResolver) MoveFile(ctx context.Context, id uuid.UUID, newDirectory string) (*model.File, error) {
	currentUser, err := auth.GetUserFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("unauthorized")
	}

	query := `UPDATE files SET directory = $1, updated_at = NOW() 
	          WHERE id = $2 AND user_id = $3
	          RETURNING id, user_id, filename, directory, original_filename, mime_type, 
	          file_size, telegram_file_id, telegram_file_unique_id, telegram_message_id,
	          storage_path, tags, description, created_at, updated_at`

	file, err := scanFile(r.DB.QueryRowContext(ctx, query, newDirectory, id, currentUser.ID))
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("file not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to move file: %w", err)
	}

	return file, nil
}

// Helper function to scan a file from a database row
func scanFile(scanner interface{ Scan(...interface{}) error }) (*model.File, error) {
	var file model.File
	var tags pq.StringArray
	var telegramFileID, telegramFileUniqueID, description sql.NullString
	var telegramMessageID sql.NullInt64

	err := scanner.Scan(
		&file.ID,
		&file.UserID,
		&file.Filename,
		&file.Directory,
		&file.OriginalFilename,
		&file.MimeType,
		&file.FileSize,
		&telegramFileID,
		&telegramFileUniqueID,
		&telegramMessageID,
		&file.StoragePath,
		&tags,
		&description,
		&file.CreatedAt,
		&file.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	file.Tags = tags
	if telegramFileID.Valid {
		file.TelegramFileID = &telegramFileID.String
	}
	if telegramFileUniqueID.Valid {
		file.TelegramFileUniqueID = &telegramFileUniqueID.String
	}
	if telegramMessageID.Valid {
		msgID := int(telegramMessageID.Int64)
		file.TelegramMessageID = &msgID
	}
	if description.Valid {
		file.Description = &description.String
	}

	return &file, nil
}
