#!/bin/bash

# LifeTrack Secure Setup Script
# This script helps you generate secure credentials for LifeTrack

set -e

echo "🔒 LifeTrack Security Setup"
echo "==========================="
echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Aborted. Your existing .env file is unchanged."
        exit 0
    fi
    cp .env .env.backup
    echo "✓ Backed up existing .env to .env.backup"
fi

echo ""
echo "Generating secure credentials..."
echo ""

# Generate secure values
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
JWT_SECRET=$(openssl rand -hex 32)

echo "✓ Generated secure PostgreSQL password"
echo "✓ Generated secure JWT secret"
echo ""

# Create .env file
cat > .env << EOF
# ⚠️  SECURITY WARNING: Never commit this file to version control!
# Generated on: $(date)

# ============================================================================
# Database Configuration
# ============================================================================
POSTGRES_DB=lifetrack
POSTGRES_USER=lifetrack
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# ============================================================================
# Backend Configuration
# ============================================================================
JWT_SECRET=${JWT_SECRET}
ENV=production

# ============================================================================
# Telegram Bot Configuration
# ============================================================================
# ⚠️  TODO: Get from @BotFather on Telegram
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN_HERE

# ⚠️  TODO: Generate AFTER starting the database (see instructions below)
SERVICE_JWT=GENERATE_AFTER_DATABASE_STARTS

# ============================================================================
# Caddy / Frontend Configuration
# ============================================================================
# ⚠️  TODO: Update with your actual domain for production
ALLOWED_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_URL=/query

# Caddy ports (optional)
CADDY_PORT=80
CADDY_HTTPS_PORT=443

# ============================================================================
# LLM Configuration (Optional)
# ============================================================================
MODEL_N_THREADS=8
MODEL_N_GPU_LAYERS=0
EOF

echo "✓ Created .env file with secure credentials"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Get Telegram Bot Token:"
echo "   - Message @BotFather on Telegram"
echo "   - Create a new bot or use existing one"
echo "   - Copy the token"
echo "   - Edit .env and replace TELEGRAM_BOT_TOKEN"
echo ""
echo "2. Start the database:"
echo "   docker-compose up -d postgres"
echo ""
echo "3. Wait for database to be healthy (may take 10-30 seconds):"
echo "   docker-compose ps"
echo ""
echo "4. Generate SERVICE_JWT:"
echo "   cd backend"
echo "   JWT_SECRET=${JWT_SECRET} \\"
echo "   DATABASE_URL=postgres://lifetrack:${POSTGRES_PASSWORD}@localhost:5432/lifetrack \\"
echo "   go run cmd/generate-service-token/main.go telegram-bot"
echo ""
echo "   Copy the output and update SERVICE_JWT in .env"
echo ""
echo "5. (Optional) For production, update ALLOWED_ORIGINS in .env:"
echo "   ALLOWED_ORIGINS=https://yourdomain.com"
echo ""
echo "6. Start all services:"
echo "   docker-compose up -d"
echo ""
echo "7. Access your application:"
echo "   http://localhost (or your domain)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 For more information, see:"
echo "   - SECURITY.md (complete security guide)"
echo "   - README.md (quick start guide)"
echo "   - SECURITY_CHANGES.md (what changed)"
echo ""
echo "⚠️  IMPORTANT: Never commit .env to git!"
echo "   (it's already in .gitignore)"
echo ""
