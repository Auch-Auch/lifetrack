package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/aleksandr/lifetrack/backend/auth"
	"github.com/aleksandr/lifetrack/backend/db"
	"github.com/aleksandr/lifetrack/backend/graph"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

const defaultPort = "8080"

func main() {
	// Load .env file if it exists (optional in Docker)
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file (this is expected in Docker)")
	}
	
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	// Initialize database connection
	database, err := db.NewDB(os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Initialize auth service
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}
	authService := auth.NewService(jwtSecret)

	// Initialize GraphQL server
	srv := handler.New(graph.NewExecutableSchema(graph.Config{
		Resolvers: &graph.Resolver{
			DB:   database,
			Auth: authService,
		},
	}))

	// Configure transport options
	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.POST{})
	srv.AddTransport(transport.Websocket{
		KeepAlivePingInterval: 10 * time.Second,
	})

	// Add GraphQL extensions
	// Use custom introspection with isDeprecated support for __InputValue
	srv.Use(extension.Introspection{})
	srv.Use(extension.AutomaticPersistedQuery{
		Cache: &graph.InMemoryCache{},
	})

	// Setup routes
	http.Handle("/", playground.Handler("LifeTrack GraphQL Playground", "/query"))
	http.Handle("/query", auth.Middleware(authService)(srv))

	// Health check endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		if err := database.Ping(context.Background()); err != nil {
			http.Error(w, "Database unavailable", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// File download endpoint
	http.Handle("/files/download/", auth.Middleware(authService)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract file ID from URL path
		fileID := r.URL.Path[len("/files/download/"):]
		if fileID == "" {
			http.Error(w, "File ID required", http.StatusBadRequest)
			return
		}

		// Get user from context (set by auth middleware)
		user, err := auth.GetUserFromContext(r.Context())
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Query file from database
		var filename, storagePath, mimeType string
		err = database.QueryRowContext(r.Context(),
			"SELECT filename, storage_path, mime_type FROM files WHERE id = $1 AND user_id = $2",
			fileID, user.ID,
		).Scan(&filename, &storagePath, &mimeType)
		if err != nil {
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}

		// Get storage root from environment or use default
		storageRoot := os.Getenv("FILE_STORAGE_PATH")
		if storageRoot == "" {
			storageRoot = "../data/files"
		}

		// Construct full file path
		filePath := storageRoot + "/" + storagePath

		// Open file
		file, err := os.Open(filePath)
		if err != nil {
			log.Printf("Error opening file %s: %v", filePath, err)
			http.Error(w, "File not found on disk", http.StatusNotFound)
			return
		}
		defer file.Close()

		// Get file info for size
		fileInfo, err := file.Stat()
		if err != nil {
			http.Error(w, "Error reading file", http.StatusInternalServerError)
			return
		}

		// Set headers for download
		w.Header().Set("Content-Disposition", "attachment; filename=\""+filename+"\"")
		w.Header().Set("Content-Type", mimeType)

		// Stream file to response (automatically sets Content-Length)
		http.ServeContent(w, r, filename, fileInfo.ModTime(), file)
	})))

	log.Printf("🚀 Server ready at http://localhost:%s/", port)
	log.Printf("🎮 GraphQL Playground at http://localhost:%s/", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
