package db

import (
	"testing"
)

func TestToSnakeCase(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Simple camelCase",
			input:    "userName",
			expected: "user_name",
		},
		{
			name:     "PascalCase",
			input:    "UserName",
			expected: "user_name",
		},
		{
			name:     "With ID suffix",
			input:    "UserID",
			expected: "user_id",
		},
		{
			name:     "Multiple capitals",
			input:    "HTTPSConnection",
			expected: "https_connection",
		},
		{
			name:     "Single letter",
			input:    "A",
			expected: "a",
		},
		{
			name:     "Empty string",
			input:    "",
			expected: "",
		},
		{
			name:     "Already snake_case",
			input:    "user_name",
			expected: "user_name",
		},
		{
			name:     "Complex example",
			input:    "UserIDHTTPRequest",
			expected: "user_idhttp_request",
		},
		{
			name:     "Single word",
			input:    "user",
			expected: "user",
		},
		{
			name:     "Acronym at start",
			input:    "IDUser",
			expected: "id_user",
		},
		{
			name:     "Mixed case",
			input:    "createdAt",
			expected: "created_at",
		},
		{
			name:     "Multiple words",
			input:    "IsActiveUser",
			expected: "is_active_user",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := toSnakeCase(tt.input)
			if result != tt.expected {
				t.Errorf("toSnakeCase(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestToSnakeCaseConsistency(t *testing.T) {
	// Test that running toSnakeCase multiple times gives the same result
	input := "UserName"
	first := toSnakeCase(input)
	second := toSnakeCase(first)
	
	if first != second {
		t.Errorf("toSnakeCase not idempotent: first=%q, second=%q", first, second)
	}
}
