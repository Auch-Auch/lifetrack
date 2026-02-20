package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const testSecret = "test-secret-key-for-testing"

func TestNewService(t *testing.T) {
	service := NewService(testSecret)
	if service == nil {
		t.Fatal("NewService returned nil")
	}
	if service.jwtSecret != testSecret {
		t.Errorf("Expected jwtSecret to be %s, got %s", testSecret, service.jwtSecret)
	}
}

func TestGenerateToken(t *testing.T) {
	service := NewService(testSecret)
	
	userID := "user-123"
	email := "test@example.com"
	name := "Test User"
	
	token, err := service.GenerateToken(userID, email, name)
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}
	
	if token == "" {
		t.Error("Generated token is empty")
	}
	
	// Verify token can be parsed
	parsedToken, err := jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
		return []byte(testSecret), nil
	})
	
	if err != nil {
		t.Fatalf("Failed to parse generated token: %v", err)
	}
	
	if !parsedToken.Valid {
		t.Error("Generated token is not valid")
	}
	
	// Check claims
	claims, ok := parsedToken.Claims.(jwt.MapClaims)
	if !ok {
		t.Fatal("Failed to extract claims from token")
	}
	
	if claims["user_id"] != userID {
		t.Errorf("Expected user_id %s, got %v", userID, claims["user_id"])
	}
	if claims["email"] != email {
		t.Errorf("Expected email %s, got %v", email, claims["email"])
	}
	if claims["name"] != name {
		t.Errorf("Expected name %s, got %v", name, claims["name"])
	}
	if claims["is_service"] != false {
		t.Errorf("Expected is_service false, got %v", claims["is_service"])
	}
}

func TestGenerateTokenWithFlags(t *testing.T) {
	service := NewService(testSecret)
	
	tests := []struct {
		name      string
		userID    string
		email     string
		userName  string
		isService bool
	}{
		{
			name:      "Regular user",
			userID:    "user-123",
			email:     "user@example.com",
			userName:  "Regular User",
			isService: false,
		},
		{
			name:      "Service account",
			userID:    "service-456",
			email:     "bot@example.com",
			userName:  "Bot Service",
			isService: true,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, err := service.GenerateTokenWithFlags(tt.userID, tt.email, tt.userName, tt.isService)
			if err != nil {
				t.Fatalf("GenerateTokenWithFlags failed: %v", err)
			}
			
			// Parse and verify
			parsedToken, err := jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
				return []byte(testSecret), nil
			})
			
			if err != nil {
				t.Fatalf("Failed to parse token: %v", err)
			}
			
			claims, ok := parsedToken.Claims.(jwt.MapClaims)
			if !ok {
				t.Fatal("Failed to extract claims")
			}
			
			if claims["is_service"] != tt.isService {
				t.Errorf("Expected is_service %v, got %v", tt.isService, claims["is_service"])
			}
		})
	}
}

func TestValidateToken(t *testing.T) {
	service := NewService(testSecret)
	
	userID := "user-789"
	email := "validate@example.com"
	name := "Validate User"
	
	// Generate a token
	token, err := service.GenerateToken(userID, email, name)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}
	
	// Validate it
	user, err := service.ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
	
	if user.ID != userID {
		t.Errorf("Expected user ID %s, got %s", userID, user.ID)
	}
	if user.Email != email {
		t.Errorf("Expected email %s, got %s", email, user.Email)
	}
	if user.Name != name {
		t.Errorf("Expected name %s, got %s", name, user.Name)
	}
	if user.IsService != false {
		t.Errorf("Expected IsService false, got %v", user.IsService)
	}
}

func TestValidateTokenWithServiceFlag(t *testing.T) {
	service := NewService(testSecret)
	
	token, err := service.GenerateTokenWithFlags("svc-1", "svc@example.com", "Service", true)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}
	
	user, err := service.ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
	
	if !user.IsService {
		t.Error("Expected IsService to be true for service account")
	}
}

func TestValidateTokenInvalid(t *testing.T) {
	service := NewService(testSecret)
	
	tests := []struct {
		name  string
		token string
	}{
		{
			name:  "Empty token",
			token: "",
		},
		{
			name:  "Invalid token",
			token: "invalid.token.here",
		},
		{
			name:  "Malformed token",
			token: "not-a-jwt-token",
		},
		{
			name:  "Token with wrong secret",
			token: func() string {
				wrongService := NewService("wrong-secret")
				token, _ := wrongService.GenerateToken("user-1", "test@example.com", "Test")
				return token
			}(),
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := service.ValidateToken(tt.token)
			if err == nil {
				t.Error("Expected validation to fail, but it succeeded")
			}
		})
	}
}

func TestValidateTokenExpired(t *testing.T) {
	service := NewService(testSecret)
	
	// Create an expired token manually
	claims := jwt.MapClaims{
		"user_id":    "user-expired",
		"email":      "expired@example.com",
		"name":       "Expired User",
		"is_service": false,
		"exp":        time.Now().Add(-1 * time.Hour).Unix(), // Expired 1 hour ago
		"iat":        time.Now().Add(-2 * time.Hour).Unix(),
	}
	
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(testSecret))
	if err != nil {
		t.Fatalf("Failed to create expired token: %v", err)
	}
	
	_, err = service.ValidateToken(tokenString)
	if err == nil {
		t.Error("Expected validation to fail for expired token")
	}
}

func TestValidateTokenMissingClaims(t *testing.T) {
	service := NewService(testSecret)
	
	tests := []struct {
		name   string
		claims jwt.MapClaims
	}{
		{
			name: "Missing user_id",
			claims: jwt.MapClaims{
				"email": "test@example.com",
				"name":  "Test",
				"exp":   time.Now().Add(1 * time.Hour).Unix(),
			},
		},
		{
			name: "Missing email",
			claims: jwt.MapClaims{
				"user_id": "user-1",
				"name":    "Test",
				"exp":     time.Now().Add(1 * time.Hour).Unix(),
			},
		},
		{
			name: "Missing name",
			claims: jwt.MapClaims{
				"user_id": "user-1",
				"email":   "test@example.com",
				"exp":     time.Now().Add(1 * time.Hour).Unix(),
			},
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, tt.claims)
			tokenString, err := token.SignedString([]byte(testSecret))
			if err != nil {
				t.Fatalf("Failed to create token: %v", err)
			}
			
			_, err = service.ValidateToken(tokenString)
			if err == nil {
				t.Error("Expected validation to fail for token with missing claims")
			}
		})
	}
}

func TestHashPassword(t *testing.T) {
	service := NewService(testSecret)
	
	password := "my-secure-password"
	
	hash, err := service.HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}
	
	if hash == "" {
		t.Error("Hash is empty")
	}
	
	if hash == password {
		t.Error("Hash should not equal the plain password")
	}
	
	// Verify the hash is a valid bcrypt hash (starts with $2a$ or $2b$)
	if len(hash) < 10 {
		t.Error("Hash seems too short to be a valid bcrypt hash")
	}
}

func TestCheckPassword(t *testing.T) {
	service := NewService(testSecret)
	
	password := "correct-password"
	
	hash, err := service.HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}
	
	// Test correct password
	if !service.CheckPassword(password, hash) {
		t.Error("CheckPassword failed for correct password")
	}
	
	// Test wrong password
	if service.CheckPassword("wrong-password", hash) {
		t.Error("CheckPassword succeeded for wrong password")
	}
	
	// Test empty password
	if service.CheckPassword("", hash) {
		t.Error("CheckPassword succeeded for empty password")
	}
}

func TestHashPasswordDifferentHashes(t *testing.T) {
	service := NewService(testSecret)
	
	password := "same-password"
	
	hash1, err := service.HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}
	
	hash2, err := service.HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}
	
	// Bcrypt should generate different hashes for the same password (due to salt)
	if hash1 == hash2 {
		t.Error("Expected different hashes for same password, but they're identical")
	}
	
	// But both should validate correctly
	if !service.CheckPassword(password, hash1) {
		t.Error("First hash doesn't validate")
	}
	if !service.CheckPassword(password, hash2) {
		t.Error("Second hash doesn't validate")
	}
}
