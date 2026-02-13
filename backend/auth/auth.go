package auth

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type contextKey string

const UserContextKey = contextKey("user")

type User struct {
	ID        string
	Email     string
	Name      string
	IsService bool // true if this is a service account (bot, etc.)
}

type Service struct {
	jwtSecret string
}

func NewService(jwtSecret string) *Service {
	return &Service{jwtSecret: jwtSecret}
}

// GenerateToken creates a JWT token for a user
func (s *Service) GenerateToken(userID, email, name string) (string, error) {
	return s.GenerateTokenWithFlags(userID, email, name, false)
}

// GenerateTokenWithFlags creates a JWT token with custom flags
func (s *Service) GenerateTokenWithFlags(userID, email, name string, isService bool) (string, error) {
	claims := jwt.MapClaims{
		"user_id":    userID,
		"email":      email,
		"name":       name,
		"is_service": isService,
		"exp":        time.Now().Add(24 * 7 * time.Hour).Unix(), // 7 days
		"iat":        time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

// ValidateToken validates and parses a JWT token
func (s *Service) ValidateToken(tokenString string) (*User, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// Validate required fields exist
		userID, ok1 := claims["user_id"].(string)
		email, ok2 := claims["email"].(string)
		name, ok3 := claims["name"].(string)

		if !ok1 || !ok2 || !ok3 {
			return nil, fmt.Errorf("invalid token claims: missing required fields")
		}

		// Get is_service flag (defaults to false if not present)
		isService := false
		if isServiceClaim, ok := claims["is_service"].(bool); ok {
			isService = isServiceClaim
		}

		return &User{
			ID:        userID,
			Email:     email,
			Name:      name,
			IsService: isService,
		}, nil
	}

	return nil, fmt.Errorf("invalid token")
}

// HashPassword hashes a password using bcrypt
func (s *Service) HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}

// CheckPassword compares a password with a hash
func (s *Service) CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// Middleware extracts and validates JWT token from Authorization header
func Middleware(authService *Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip auth for introspection queries (for playground)
			if r.URL.Path == "/" {
				next.ServeHTTP(w, r)
				return
			}

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				// Allow requests without auth (will be handled by resolver)
				next.ServeHTTP(w, r)
				return
			}

			// Extract token from "Bearer <token>"
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				http.Error(w, "Invalid authorization header", http.StatusUnauthorized)
				return
			}

			user, err := authService.ValidateToken(parts[1])
			if err != nil {
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}

			// Add user to context
			ctx := context.WithValue(r.Context(), UserContextKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserFromContext extracts user from context
func GetUserFromContext(ctx context.Context) (*User, error) {
	user, ok := ctx.Value(UserContextKey).(*User)
	if !ok {
		return nil, fmt.Errorf("user not found in context")
	}
	return user, nil
}

// RequireAuth ensures user is authenticated
func RequireAuth(ctx context.Context) (*User, error) {
	user, err := GetUserFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required")
	}
	return user, nil
}
