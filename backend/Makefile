.PHONY: test test-verbose test-coverage test-short clean help

# Default target
help:
	@echo "Available targets:"
	@echo "  make test          - Run all tests"
	@echo "  make test-verbose  - Run tests with verbose output"
	@echo "  make test-coverage - Run tests with coverage report"
	@echo "  make test-short    - Run tests in short mode (skip long tests)"
	@echo "  make test-watch    - Run tests in watch mode"
	@echo "  make clean         - Clean test cache and coverage files"
	@echo "  make bench         - Run benchmarks"

# Run all tests
test:
	@echo "Running tests..."
	go test ./... -count=1

# Run tests with verbose output
test-verbose:
	@echo "Running tests with verbose output..."
	go test ./... -v -count=1

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	go test ./... -coverprofile=coverage.out -covermode=atomic
	@echo "\nCoverage summary:"
	go tool cover -func=coverage.out | tail -1
	@echo "\nTo view HTML coverage report, run:"
	@echo "  go tool cover -html=coverage.out"

# Run tests in short mode
test-short:
	@echo "Running tests in short mode..."
	go test ./... -short -count=1

# Run tests in watch mode (requires entr or similar tool)
test-watch:
	@echo "Running tests in watch mode (requires 'entr' tool)..."
	@echo "Install entr with: brew install entr (macOS) or apt install entr (Linux)"
	@find . -name "*.go" | entr -c go test ./... -count=1

# Run benchmarks
bench:
	@echo "Running benchmarks..."
	go test ./... -bench=. -benchmem

# Clean test cache and coverage files
clean:
	@echo "Cleaning test cache and coverage files..."
	go clean -testcache
	rm -f coverage.out
	@echo "Done!"
