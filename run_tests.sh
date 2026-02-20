#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Default values
RUN_BACKEND=true
RUN_BOT=true
RUN_FRONTEND=true
COVERAGE=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-only)
            RUN_BOT=false
            RUN_FRONTEND=false
            shift
            ;;
        --bot-only)
            RUN_BACKEND=false
            RUN_FRONTEND=false
            shift
            ;;
        --frontend-only)
            RUN_BACKEND=false
            RUN_BOT=false
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./run_tests.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --backend-only    Run only backend tests"
            echo "  --bot-only        Run only bot tests"
            echo "  --frontend-only   Run only frontend tests"
            echo "  --coverage        Generate coverage reports"
            echo "  --verbose, -v     Run tests with verbose output"
            echo "  --help, -h        Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./run_tests.sh                    # Run all tests"
            echo "  ./run_tests.sh --coverage         # Run all tests with coverage"
            echo "  ./run_tests.sh --backend-only -v  # Run backend tests verbosely"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help to see available options"
            exit 1
            ;;
    esac
done

# Track overall success
OVERALL_SUCCESS=true

# Backend tests
if [ "$RUN_BACKEND" = true ]; then
    print_header "Running Backend Tests (Go)"
    cd backend || exit 1
    
    if [ "$COVERAGE" = true ]; then
        if [ "$VERBOSE" = true ]; then
            make test-coverage VERBOSE=1
        else
            make test-coverage
        fi
    else
        if [ "$VERBOSE" = true ]; then
            make test-verbose
        else
            make test
        fi
    fi
    
    BACKEND_EXIT=$?
    cd ..
    
    if [ $BACKEND_EXIT -eq 0 ]; then
        print_success "Backend tests passed"
    else
        print_error "Backend tests failed"
        OVERALL_SUCCESS=false
    fi
fi

# Bot tests
if [ "$RUN_BOT" = true ]; then
    print_header "Running Bot Tests (Python)"
    cd bot || exit 1
    
    if [ "$COVERAGE" = true ]; then
        if [ "$VERBOSE" = true ]; then
            make test-coverage VERBOSE=1
        else
            make test-coverage
        fi
    else
        if [ "$VERBOSE" = true ]; then
            make test-verbose
        else
            make test
        fi
    fi
    
    BOT_EXIT=$?
    cd ..
    
    if [ $BOT_EXIT -eq 0 ]; then
        print_success "Bot tests passed"
    else
        print_error "Bot tests failed"
        OVERALL_SUCCESS=false
    fi
fi

# Frontend tests
if [ "$RUN_FRONTEND" = true ]; then
    print_header "Running Frontend Tests (React/Next.js)"
    cd lifetrack_front || exit 1
    
    if [ "$COVERAGE" = true ]; then
        if [ "$VERBOSE" = true ]; then
            npm run test:coverage -- --verbose
        else
            npm run test:coverage
        fi
    else
        if [ "$VERBOSE" = true ]; then
            npm test -- --verbose
        else
            npm test
        fi
    fi
    
    FRONTEND_EXIT=$?
    cd ..
    
    if [ $FRONTEND_EXIT -eq 0 ]; then
        print_success "Frontend tests passed"
    else
        print_error "Frontend tests failed"
        OVERALL_SUCCESS=false
    fi
fi

# Summary
print_header "Test Summary"

if [ "$RUN_BACKEND" = true ]; then
    if [ $BACKEND_EXIT -eq 0 ]; then
        print_success "Backend: PASSED"
    else
        print_error "Backend: FAILED"
    fi
fi

if [ "$RUN_BOT" = true ]; then
    if [ $BOT_EXIT -eq 0 ]; then
        print_success "Bot: PASSED"
    else
        print_error "Bot: FAILED"
    fi
fi

if [ "$RUN_FRONTEND" = true ]; then
    if [ $FRONTEND_EXIT -eq 0 ]; then
        print_success "Frontend: PASSED"
    else
        print_error "Frontend: FAILED"
    fi
fi

echo ""

if [ "$OVERALL_SUCCESS" = true ]; then
    print_success "All tests passed! 🎉"
    exit 0
else
    print_error "Some tests failed"
    exit 1
fi
