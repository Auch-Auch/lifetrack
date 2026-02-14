# LifeTrack Backend

GraphQL API server for LifeTrack, built with Go and PostgreSQL.

## Tech Stack

- **Go 1.25+**
- **gqlgen** - GraphQL code generation
- **PostgreSQL 16+** - Database with full-text search
- **JWT** - Authentication (HS256)
- **sqlx** - SQL toolkit
- **golang-migrate** - Database migrations

## Setup

### Prerequisites

```bash
# Install Go 1.25+
# Install PostgreSQL 16+

# Install golang-migrate
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Install gqlgen (for code generation)
go install github.com/99designs/gqlgen@latest
```

### Database Setup

```bash
# Create database
createdb lifetrack

# Or with psql
psql -U postgres
CREATE DATABASE lifetrack;
CREATE USER lifetrack WITH PASSWORD 'lifetrack';
GRANT ALL PRIVILEGES ON DATABASE lifetrack TO lifetrack;
```

### Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Generate JWT secret: openssl rand -hex 32
```

### Generate Service Token (for Telegram Bot)

Service accounts are registered as users in the database with `is_service = true`.

```bash
# Run migrations first to add is_service column
./migrate.sh up

# Build the tool
go build -o generate-service-token ./cmd/generate-service-token

# Generate token and create service account
JWT_SECRET=your-jwt-secret DATABASE_URL=postgres://... ./generate-service-token telegram-bot

# Or specify a custom service name
JWT_SECRET=your-jwt-secret DATABASE_URL=postgres://... ./generate-service-token my-service

# Add the output to your .env file as SERVICE_JWT
```

**Note:** Service accounts are stored in the database with no password and authenticate via JWT tokens.

### Run Migrations

**Local Development:**
```bash
# Apply all migrations
./migrate.sh up

# Rollback one migration
./migrate.sh down

# Check migration version
./migrate.sh version
```

**Docker/Podman Deployment:**  
Migrations run automatically when the backend container starts via `entrypoint.sh`.

### Install Dependencies

```bash
go mod download
```

### Generate GraphQL Code

```bash
# Generate resolvers and types from schema
go run github.com/99designs/gqlgen generate
```

## Development

### Run Server

```bash
# Run with hot reload (requires air)
air

# Or run directly
go run cmd/server/main.go
```

Server will start on http://localhost:8080

- GraphQL Playground: http://localhost:8080/
- GraphQL Endpoint: http://localhost:8080/query
- Health Check: http://localhost:8080/health

### Example Queries

**Register:**
```graphql
mutation {
  register(
    email: "user@example.com"
    password: "password123"
    name: "John Doe"
  ) {
    token
    user {
      id
      email
      name
    }
  }
}
```

**Login:**
```graphql
mutation {
  login(
    email: "user@example.com"
    password: "password123"
  ) {
    token
    user {
      id
      name
    }
  }
}
```

**Get Current User (with auth header):**
```graphql
query {
  me {
    id
    email
    name
  }
}
```

Header: `Authorization: Bearer <your-jwt-token>`

## Project Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go          # Entry point
├── auth/
│   └── auth.go             # JWT authentication
├── db/
│   ├── db.go               # Database connection
│   └── migrations/         # SQL migrations
├── graph/
│   ├── schema.graphqls     # GraphQL schema
│   ├── schema.resolvers.go # Resolver implementations
│   ├── resolver.go         # Resolver root
│   └── model/              # Generated models (auto)
├── gqlgen.yml              # gqlgen configuration
├── go.mod
├── migrate.sh              # Migration helper
└── README.md
```

## Deployment

### Docker Build

```bash
docker build -t lifetrack-backend .
docker run -p 8080:8080 --env-file .env lifetrack-backend
```

### Production Checklist

- [ ] Change JWT_SECRET to strong random value
- [ ] Use PostgreSQL with SSL (sslmode=require)
- [ ] Set up reverse proxy (nginx/Caddy) with HTTPS
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Use connection pooling for database
- [ ] Enable GraphQL query complexity limits
- [ ] Review and test all authorization checks

## Testing

```bash
# Run tests
go test ./...

# With coverage
go test -cover ./...

# Verbose
go test -v ./...
```

## API Documentation

GraphQL schema is fully documented. Access the interactive playground at:
http://localhost:8080/

The playground provides:
- Schema explorer
- Query auto-completion
- Documentation browser
- Query history
