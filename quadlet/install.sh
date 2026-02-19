#!/bin/bash
# LifeTrack Quadlet Installation Script
# This script automates the setup of Quadlet configuration for LifeTrack

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}LifeTrack Quadlet Setup${NC}"
echo "======================================"

# Check if Podman is installed
if ! command -v podman &> /dev/null; then
    echo -e "${RED}Error: Podman is not installed. Please install Podman first.${NC}"
    exit 1
fi

# Check Podman version
PODMAN_VERSION=$(podman --version | awk '{print $3}')
echo -e "${GREEN}✓${NC} Podman version: $PODMAN_VERSION"

# Ask user if they want system-wide or user-level installation
echo ""
echo "Choose installation type:"
echo "1) System-wide (requires sudo, services run as system services)"
echo "2) User-level (rootless, services run under your user)"
read -p "Enter choice [1-2]: " INSTALL_TYPE

if [[ "$INSTALL_TYPE" == "1" ]]; then
    TARGET_DIR="/etc/containers/systemd"
    SYSTEMCTL="sudo systemctl"
    echo -e "${YELLOW}Installing as system-wide services${NC}"
elif [[ "$INSTALL_TYPE" == "2" ]]; then
    TARGET_DIR="$HOME/.config/containers/systemd"
    SYSTEMCTL="systemctl --user"
    echo -e "${YELLOW}Installing as user-level services${NC}"
else
    echo -e "${RED}Invalid choice. Exiting.${NC}"
    exit 1
fi

# Create target directory
echo ""
echo -e "${GREEN}Creating directory: $TARGET_DIR${NC}"
if [[ "$INSTALL_TYPE" == "1" ]]; then
    sudo mkdir -p "$TARGET_DIR"
else
    mkdir -p "$TARGET_DIR"
fi

# Copy Quadlet files
echo -e "${GREEN}Copying Quadlet files...${NC}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

if [[ "$INSTALL_TYPE" == "1" ]]; then
    sudo cp "$SCRIPT_DIR"/*.network "$TARGET_DIR/" 2>/dev/null || true
    sudo cp "$SCRIPT_DIR"/*.volume "$TARGET_DIR/" 2>/dev/null || true
    sudo cp "$SCRIPT_DIR"/*.container "$TARGET_DIR/" 2>/dev/null || true
else
    cp "$SCRIPT_DIR"/*.network "$TARGET_DIR/" 2>/dev/null || true
    cp "$SCRIPT_DIR"/*.volume "$TARGET_DIR/" 2>/dev/null || true
    cp "$SCRIPT_DIR"/*.container "$TARGET_DIR/" 2>/dev/null || true
fi

echo -e "${GREEN}✓${NC} Quadlet files installed"

# Build container images
echo ""
echo -e "${YELLOW}Building container images...${NC}"
echo "This may take several minutes."

PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}Building backend...${NC}"
podman build -t lifetrack-backend:latest "$PROJECT_ROOT/backend"

echo -e "${GREEN}Building bot...${NC}"
podman build -t lifetrack-bot:latest "$PROJECT_ROOT/bot"

echo -e "${GREEN}Building frontend...${NC}"
podman build -t lifetrack-frontend:latest \
    --build-arg NEXT_PUBLIC_API_URL=/query \
    "$PROJECT_ROOT/lifetrack_front"

echo -e "${GREEN}✓${NC} All images built successfully"

# Reload systemd
echo ""
echo -e "${GREEN}Reloading systemd daemon...${NC}"
$SYSTEMCTL daemon-reload

# Check if environment variables are configured
echo ""
echo -e "${YELLOW}Important: Configure environment variables${NC}"
if [[ "$INSTALL_TYPE" == "1" ]]; then
    echo "Create environment files in /etc/systemd/system/lifetrack-*.service.d/"
    echo "See README.md for details."
else
    echo "Create ~/.config/environment.d/lifetrack.conf with required variables"
    echo "See README.md for details."
fi

# Ask if user wants to enable services
echo ""
read -p "Do you want to enable services to start on boot? [y/N]: " ENABLE_SERVICES

if [[ "$ENABLE_SERVICES" =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Enabling services...${NC}"
    $SYSTEMCTL enable lifetrack-postgres.service
    $SYSTEMCTL enable lifetrack-backend.service
    $SYSTEMCTL enable lifetrack-bot.service
    $SYSTEMCTL enable lifetrack-frontend.service
    $SYSTEMCTL enable lifetrack-caddy.service
    echo -e "${GREEN}✓${NC} Services enabled"
    
    # Enable lingering for user services
    if [[ "$INSTALL_TYPE" == "2" ]]; then
        loginctl enable-linger "$USER"
        echo -e "${GREEN}✓${NC} Lingering enabled for user"
    fi
fi

# Ask if user wants to start services now
echo ""
read -p "Do you want to start services now? [y/N]: " START_SERVICES

if [[ "$START_SERVICES" =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Starting services...${NC}"
    $SYSTEMCTL start lifetrack-postgres.service
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
    $SYSTEMCTL start lifetrack-backend.service
    echo "Waiting for backend to be ready..."
    sleep 3
    $SYSTEMCTL start lifetrack-bot.service
    $SYSTEMCTL start lifetrack-frontend.service
    $SYSTEMCTL start lifetrack-caddy.service
    
    echo -e "${GREEN}✓${NC} Services started"
    
    echo ""
    echo "Service status:"
    $SYSTEMCTL status lifetrack-*.service --no-pager || true
fi

echo ""
echo -e "${GREEN}======================================"
echo "Setup complete!"
echo "======================================${NC}"
echo ""
echo "Useful commands:"
echo "  Status:  $SYSTEMCTL status lifetrack-*.service"
echo "  Logs:    journalctl $([ "$INSTALL_TYPE" == "2" ] && echo "--user ") -u lifetrack-backend.service -f"
echo "  Restart: $SYSTEMCTL restart lifetrack-backend.service"
echo ""
echo "For more information, see README.md"
