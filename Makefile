.PHONY: help test test-backend test-bot test-frontend test-coverage clean

# Default target
help:
	@echo "LifeTrack - Test Runner"
	@echo ""
	@echo "Available targets:"
	@echo "  make test              - Run all tests (backend, bot, frontend)"
	@echo "  make test-backend      - Run backend tests only"
	@echo "  make test-bot          - Run bot tests only"
	@echo "  make test-frontend     - Run frontend tests only"
	@echo "  make test-coverage     - Run all tests with coverage reports"
	@echo "  make clean             - Clean all test caches and coverage files"
	@echo ""
	@echo "Examples:"
	@echo "  make test              # Run all tests"
	@echo "  make test-coverage     # Run all tests with coverage"
	@echo "  make test-backend      # Run only backend tests"

# Run all tests
test:
	@echo "Running all tests..."
	@./run_tests.sh

# Run backend tests only
test-backend:
	@echo "Running backend tests..."
	@./run_tests.sh --backend-only

# Run bot tests only
test-bot:
	@echo "Running bot tests..."
	@./run_tests.sh --bot-only

# Run frontend tests only
test-frontend:
	@echo "Running frontend tests..."
	@./run_tests.sh --frontend-only

# Run all tests with coverage
test-coverage:
	@echo "Running all tests with coverage..."
	@./run_tests.sh --coverage

# Clean all test caches and coverage files
clean:
	@echo "Cleaning test caches and coverage files..."
	@cd backend && make clean 2>/dev/null || true
	@cd bot && make clean 2>/dev/null || true
	@cd lifetrack_front && rm -rf coverage .next/cache 2>/dev/null || true
	@echo "Done!"
