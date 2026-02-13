package main

import (
	"database/sql"
	"fmt"
	"os"

	"github.com/aleksandr/lifetrack/backend/auth"
	"github.com/aleksandr/lifetrack/backend/db"
	"github.com/google/uuid"
)

func main() {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		fmt.Fprintln(os.Stderr, "Error: JWT_SECRET environment variable is required")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Usage:")
		fmt.Fprintln(os.Stderr, "  JWT_SECRET=your-secret DATABASE_URL=your-db-url ./generate-service-token [service-name]")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Example:")
		fmt.Fprintln(os.Stderr, "  JWT_SECRET=my-secret DATABASE_URL=postgres://... ./generate-service-token telegram-bot")
		os.Exit(1)
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		fmt.Fprintln(os.Stderr, "Error: DATABASE_URL environment variable is required")
		os.Exit(1)
	}

	serviceName := "telegram-bot"
	if len(os.Args) > 1 {
		serviceName = os.Args[1]
	}

	// Connect to database
	database, err := db.NewDB(databaseURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer database.Close()

	// Check if service account already exists
	var existingID string
	email := serviceName + "@service.lifetrack"
	err = database.QueryRow(
		"SELECT id FROM users WHERE email = $1 AND is_service = TRUE",
		email,
	).Scan(&existingID)

	var serviceID string
	if err == sql.ErrNoRows {
		// Create service account
		serviceID = uuid.New().String()
		_, err = database.Exec(`
			INSERT INTO users (id, email, name, is_service, is_active, password_hash)
			VALUES ($1, $2, $3, TRUE, TRUE, NULL)
		`, serviceID, email, serviceName)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to create service account: %v\n", err)
			os.Exit(1)
		}
		fmt.Fprintf(os.Stderr, "✓ Created service account: %s (ID: %s)\n", serviceName, serviceID)
	} else if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to query database: %v\n", err)
		os.Exit(1)
	} else {
		serviceID = existingID
		fmt.Fprintf(os.Stderr, "✓ Service account already exists: %s (ID: %s)\n", serviceName, serviceID)
	}

	// Generate token with is_service flag
	authService := auth.NewService(jwtSecret)
	token, err := authService.GenerateTokenWithFlags(serviceID, email, serviceName, true)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to generate token: %v\n", err)
		os.Exit(1)
	}

	fmt.Fprintf(os.Stderr, "\n✓ Service JWT Token:\n")
	fmt.Println(token)
	fmt.Fprintf(os.Stderr, "\nAdd this to your .env file as SERVICE_JWT\n")
}
