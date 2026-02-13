#!/bin/bash

# Database Migration Script
# Usage: ./migrate.sh up|down|version|force|drop

set -e

# ⚠️  DATABASE_URL is REQUIRED - no default provided for security
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is required"
  echo "Example: DATABASE_URL=postgres://user:pass@host:port/db ./migrate.sh up"
  exit 1
fi

DB_URL="${DATABASE_URL}"
MIGRATIONS_DIR="./db/migrations"

command -v migrate >/dev/null 2>&1 || {
  echo "Error: golang-migrate is not installed."
  echo "Install with: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"
  exit 1
}

case "$1" in
  up)
    echo "Running migrations up..."
    migrate -path "$MIGRATIONS_DIR" -database "$DB_URL" up
    echo "✅ Migrations applied successfully"
    ;;
  down)
    echo "Rolling back one migration..."
    migrate -path "$MIGRATIONS_DIR" -database "$DB_URL" down 1
    echo "✅ Rollback complete"
    ;;
  drop)
    echo "⚠️  WARNING: This will drop all tables!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      migrate -path "$MIGRATIONS_DIR" -database "$DB_URL" drop
      echo "✅ Database dropped"
    else
      echo "Aborted"
    fi
    ;;
  version)
    migrate -path "$MIGRATIONS_DIR" -database "$DB_URL" version
    ;;
  force)
    if [ -z "$2" ]; then
      echo "Usage: ./migrate.sh force <version>"
      exit 1
    fi
    migrate -path "$MIGRATIONS_DIR" -database "$DB_URL" force "$2"
    echo "✅ Forced version $2"
    ;;
  *)
    echo "Usage: ./migrate.sh {up|down|version|force|drop}"
    exit 1
    ;;
esac
