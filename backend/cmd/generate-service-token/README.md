# Generate Service Token

Creates a service account in the database and generates a JWT token for authentication.

## Usage

```bash
# Set your JWT secret and database URL
export JWT_SECRET="your-jwt-secret-here"
export DATABASE_URL="postgres://user:pass@localhost:5432/lifetrack?sslmode=disable"

# Generate token and create service account
go run cmd/generate-service-token/main.go telegram-bot
```

## Or build and run

```bash
# Build
go build -o generate-service-token ./cmd/generate-service-token

# Run
JWT_SECRET="your-secret" DATABASE_URL="postgres://..." ./generate-service-token telegram-bot

# With custom service name
JWT_SECRET="your-secret" DATABASE_URL="postgres://..." ./generate-service-token my-service
```

## What it does

1. Connects to the database
2. Creates a service user with:
   - Email: `{service-name}@service.lifetrack`
   - Name: `{service-name}`
   - `is_service` flag set to `true`
   - No password (service accounts authenticate via JWT only)
3. Generates a standard JWT token for the service account
4. Outputs the token to stdout

## Add to .env

Copy the generated token to your `.env` file:

```bash
SERVICE_JWT=<generated-token>
```

**Note:** Service tokens follow the same expiration rules as user tokens (7 days). Service accounts are stored in the database as regular users with the `is_service` flag set to `true`.
