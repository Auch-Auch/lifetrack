#!/bin/sh

set -e

echo "Waiting for database to be ready..."
# Try to connect to the database using psql or by checking postgres host
until migrate -path /root/db/migrations -database "$DATABASE_URL" version 2>&1 | grep -qE "(dirty|^[0-9]+$|no migration)"; do
  echo "Database not ready, waiting..."
  sleep 2
done

echo "Running database migrations..."
migrate -path /root/db/migrations -database "$DATABASE_URL" up

echo "Starting backend server..."
./main 2>&1
echo "Backend server exited with code: $?"
