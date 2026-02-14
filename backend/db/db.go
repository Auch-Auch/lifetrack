package db

import (
	"context"
	"fmt"
	"strings"

	"github.com/jmoiron/sqlx"
	"github.com/jmoiron/sqlx/reflectx"
	_ "github.com/lib/pq"
)

type DB struct {
	*sqlx.DB
}

// NewDB creates a new database connection
func NewDB(databaseURL string) (*DB, error) {
	db, err := sqlx.Connect("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Configure sqlx to use a custom mapper that converts struct field names to snake_case
	// This maps struct fields like "UserID" to database columns like "user_id"
	db.Mapper = reflectx.NewMapperFunc("db", func(s string) string {
		return toSnakeCase(s)
	})

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	// Verify connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &DB{db}, nil
}

// toSnakeCase converts a string from PascalCase/camelCase to snake_case
// Handles acronyms properly: ID -> id, UserID -> user_id, HTTPSConnection -> https_connection
func toSnakeCase(s string) string {
	if s == "" {
		return ""
	}
	
	var result strings.Builder
	runes := []rune(s)
	
	for i := 0; i < len(runes); i++ {
		r := runes[i]
		
		// Add underscore before uppercase letter if:
		// 1. Not the first character
		// 2. Previous character is lowercase or next character is lowercase (handles acronyms)
		if i > 0 && r >= 'A' && r <= 'Z' {
			prevIsLower := runes[i-1] >= 'a' && runes[i-1] <= 'z'
			nextIsLower := i+1 < len(runes) && runes[i+1] >= 'a' && runes[i+1] <= 'z'
			
			if prevIsLower || nextIsLower {
				result.WriteRune('_')
			}
		}
		
		result.WriteRune(r)
	}
	
	return strings.ToLower(result.String())
}

// Ping checks if the database connection is alive
func (db *DB) Ping(ctx context.Context) error {
	return db.PingContext(ctx)
}