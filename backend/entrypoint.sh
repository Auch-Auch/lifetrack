#!/bin/sh

set -e

echo "Waiting for database to be ready..."
until migrate -path /root/db/migrations -database "$DATABASE_URL" version 2>/dev/null; do
  echo "Database not ready, waiting..."
  sleep 2
done

echo "Running database migrations..."
migrate -path /root/db/migrations -database "$DATABASE_URL" up

echo "Starting backend server..."
exec ./main
