.PHONY: test test-verbose test-coverage test-unit test-integration test-watch clean help lint format

# Default target
help:
	@echo "Available targets:"
	@echo "  make test              - Run all tests"
	@echo "  make test-verbose      - Run tests with verbose output"
	@echo "  make test-coverage     - Run tests with coverage report"
	@echo "  make test-unit         - Run only unit tests"
	@echo "  make test-integration  - Run only integration tests"
	@echo "  make test-watch        - Run tests in watch mode"
	@echo "  make lint              - Run linting (black, isort)"
	@echo "  make format            - Auto-format code"
	@echo "  make clean             - Clean cache and coverage files"

# Run all tests
test:
	@echo "Running tests..."
	pytest

# Run tests with verbose output
test-verbose:
	@echo "Running tests with verbose output..."
	pytest -v

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	pytest --cov=. --cov-report=html --cov-report=term-missing
	@echo "\nCoverage report generated in htmlcov/index.html"

# Run only unit tests
test-unit:
	@echo "Running unit tests..."
	pytest -m unit

# Run only integration tests
test-integration:
	@echo "Running integration tests..."
	pytest -m integration

# Run tests in watch mode (requires pytest-watch)
test-watch:
	@echo "Running tests in watch mode..."
	@echo "Install pytest-watch with: pip install pytest-watch"
	pytest-watch

# Run linting
lint:
	@echo "Running linting..."
	@echo "Checking with black..."
	black --check .
	@echo "Checking with isort..."
	isort --check-only .

# Format code
format:
	@echo "Formatting code..."
	black .
	isort .

# Clean cache and coverage files
clean:
	@echo "Cleaning cache and coverage files..."
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage
	rm -rf __pycache__
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	@echo "Done!"
