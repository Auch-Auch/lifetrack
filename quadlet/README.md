# LifeTrack Quadlet Configuration

This directory contains Podman Quadlet configuration files to run the LifeTrack application as systemd services.

## What is Quadlet?

Quadlet is a systemd generator that allows you to manage Podman containers as native systemd services. It provides better integration with the init system compared to docker-compose, including:
- Automatic dependency management
- System-level service management
- Better resource control via systemd
- Integration with systemd logging (journalctl)

## Prerequisites

- **Podman** 4.4+ (with Quadlet support)
- **systemd** (Linux init system)
- **Environment variables** configured (see below)

## Directory Structure

```
quadlet/
├── lifetrack.network                   # Network definition
├── lifetrack-postgres-data.volume      # PostgreSQL data volume
├── lifetrack-caddy-data.volume         # Caddy data volume
├── lifetrack-caddy-config.volume       # Caddy config volume
├── lifetrack-caddy-logs.volume         # Caddy logs volume
├── lifetrack-postgres.container        # PostgreSQL service
├── lifetrack-backend.container         # Backend GraphQL API
├── lifetrack-bot.container             # Telegram Bot with LLM
├── lifetrack-frontend.container        # Frontend Web App
└── lifetrack-caddy.container           # Caddy reverse proxy
```

## Setup Instructions

### 1. Build Container Images

Before deploying, you need to build the custom images:

```bash
# Build backend image
cd /home/aleksandr/lifetrack
podman build -t lifetrack-backend:latest ./backend

# Build bot image
podman build -t lifetrack-bot:latest ./bot

# Build frontend image (with build args)
podman build -t lifetrack-frontend:latest \
  --build-arg NEXT_PUBLIC_API_URL=/query \
  ./lifetrack_front
```

### 2. Configure Environment Variables

Quadlet reads environment variables from the environment where systemd runs. You have two options:

#### Option A: System-wide environment (recommended for system services)

Create `/etc/systemd/system/lifetrack.service.d/environment.conf`:

```bash
sudo mkdir -p /etc/systemd/system/lifetrack-postgres.service.d
sudo mkdir -p /etc/systemd/system/lifetrack-backend.service.d
sudo mkdir -p /etc/systemd/system/lifetrack-bot.service.d
sudo mkdir -p /etc/systemd/system/lifetrack-frontend.service.d
sudo mkdir -p /etc/systemd/system/lifetrack-caddy.service.d
```

Then create environment files for each service:

```bash
# /etc/systemd/system/lifetrack-postgres.service.d/environment.conf
[Service]
Environment="POSTGRES_DB=lifetrack"
Environment="POSTGRES_USER=lifetrack_user"
Environment="POSTGRES_PASSWORD=your_secure_password"

# /etc/systemd/system/lifetrack-backend.service.d/environment.conf
[Service]
Environment="POSTGRES_DB=lifetrack"
Environment="POSTGRES_USER=lifetrack_user"
Environment="POSTGRES_PASSWORD=your_secure_password"
Environment="JWT_SECRET=your_jwt_secret"
Environment="ENV=production"

# /etc/systemd/system/lifetrack-bot.service.d/environment.conf
[Service]
Environment="TELEGRAM_BOT_TOKEN=your_bot_token"
Environment="SERVICE_JWT=your_service_jwt"

# /etc/systemd/system/lifetrack-frontend.service.d/environment.conf
[Service]
Environment="NEXT_PUBLIC_API_URL=/query"

# /etc/systemd/system/lifetrack-caddy.service.d/environment.conf
[Service]
Environment="ALLOWED_ORIGINS=https://yourdomain.com"
Environment="CADDY_PORT=8001"
```

#### Option B: User-level environment (for rootless Podman)

For user services, create `~/.config/environment.d/lifetrack.conf`:

```bash
mkdir -p ~/.config/environment.d
cat > ~/.config/environment.d/lifetrack.conf <<EOF
POSTGRES_DB=lifetrack
POSTGRES_USER=lifetrack_user
POSTGRES_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret
TELEGRAM_BOT_TOKEN=your_bot_token
SERVICE_JWT=your_service_jwt
ENV=production
NEXT_PUBLIC_API_URL=/query
ALLOWED_ORIGINS=https://yourdomain.com
CADDY_PORT=8001
EOF
```

### 3. Install Quadlet Files

Choose one of the following based on whether you want system-wide or user-level services:

#### For system-wide services (requires root):
```bash
sudo mkdir -p /etc/containers/systemd
sudo cp quadlet/*.{network,volume,container} /etc/containers/systemd/
sudo systemctl daemon-reload
```

#### For user-level services (rootless Podman):
```bash
mkdir -p ~/.config/containers/systemd
cp quadlet/*.{network,volume,container} ~/.config/containers/systemd/
systemctl --user daemon-reload
```

### 4. Enable and Start Services

#### System-wide services:
```bash
# Enable services to start on boot
sudo systemctl enable lifetrack-postgres.service
sudo systemctl enable lifetrack-backend.service
sudo systemctl enable lifetrack-bot.service
sudo systemctl enable lifetrack-frontend.service
sudo systemctl enable lifetrack-caddy.service

# Start all services
sudo systemctl start lifetrack-postgres.service
sudo systemctl start lifetrack-backend.service
sudo systemctl start lifetrack-bot.service
sudo systemctl start lifetrack-frontend.service
sudo systemctl start lifetrack-caddy.service
```

#### User-level services:
```bash
# Enable services to start on user login
systemctl --user enable lifetrack-postgres.service
systemctl --user enable lifetrack-backend.service
systemctl --user enable lifetrack-bot.service
systemctl --user enable lifetrack-frontend.service
systemctl --user enable lifetrack-caddy.service

# Start all services
systemctl --user start lifetrack-postgres.service
systemctl --user start lifetrack-backend.service
systemctl --user start lifetrack-bot.service
systemctl --user start lifetrack-frontend.service
systemctl --user start lifetrack-caddy.service

# Enable lingering to keep services running when not logged in
loginctl enable-linger $USER
```

## Managing Services

### Check Service Status

```bash
# System-wide
sudo systemctl status lifetrack-*.service

# User-level
systemctl --user status lifetrack-*.service
```

### View Logs

```bash
# System-wide
sudo journalctl -u lifetrack-postgres.service -f
sudo journalctl -u lifetrack-backend.service -f
sudo journalctl -u lifetrack-bot.service -f
sudo journalctl -u lifetrack-frontend.service -f
sudo journalctl -u lifetrack-caddy.service -f

# User-level
journalctl --user -u lifetrack-postgres.service -f
journalctl --user -u lifetrack-backend.service -f
```

### Stop Services

```bash
# System-wide
sudo systemctl stop lifetrack-caddy.service
sudo systemctl stop lifetrack-frontend.service
sudo systemctl stop lifetrack-bot.service
sudo systemctl stop lifetrack-backend.service
sudo systemctl stop lifetrack-postgres.service

# User-level
systemctl --user stop lifetrack-caddy.service
systemctl --user stop lifetrack-frontend.service
systemctl --user stop lifetrack-bot.service
systemctl --user stop lifetrack-backend.service
systemctl --user stop lifetrack-postgres.service
```

### Restart Services

```bash
# System-wide
sudo systemctl restart lifetrack-backend.service

# User-level
systemctl --user restart lifetrack-backend.service
```

### Disable Services

```bash
# System-wide
sudo systemctl disable lifetrack-*.service

# User-level
systemctl --user disable lifetrack-*.service
```

## Service Dependencies

The services are configured with the following dependency chain:

```
lifetrack-postgres (base)
    └── lifetrack-backend (depends on postgres)
        ├── lifetrack-bot (depends on backend)
        ├── lifetrack-frontend (depends on backend)
        └── lifetrack-caddy (depends on backend & frontend)
```

Systemd will automatically start services in the correct order.

## Networking

All services run in the `lifetrack_network` Podman network. Service discovery works via container names:
- `lifetrack_postgres` - PostgreSQL database
- `lifetrack_backend` - GraphQL API (port 8080)
- `lifetrack_frontend` - Next.js frontend (port 3000)
- `lifetrack_caddy` - Reverse proxy (port 8001, exposed to host)

## Data Persistence

Data is persisted in the following locations:

### Podman Volumes:
- `lifetrack_postgres_data` - PostgreSQL database
- `lifetrack_caddy_data` - Caddy data
- `lifetrack_caddy_config` - Caddy config
- `lifetrack_caddy_logs` - Caddy logs

### Host Bind Mounts:
- `~/lifetrack/data/files` - File storage (shared by backend and bot)
- `~/lifetrack/models` - LLM models (bot)
- `~/lifetrack/bot/data` - Bot data (FAISS index)
- `~/lifetrack/backend/graph` - GraphQL schema (bot RAG)
- `~/lifetrack/Caddyfile` - Caddy configuration

## Updating Images

After modifying code, rebuild and restart:

```bash
# Rebuild image
podman build -t lifetrack-backend:latest ./backend

# Restart service
sudo systemctl restart lifetrack-backend.service
# or
systemctl --user restart lifetrack-backend.service
```

## Troubleshooting

### Check if Quadlet files are loaded correctly:
```bash
# System-wide
sudo systemctl list-units 'lifetrack-*'

# User-level
systemctl --user list-units 'lifetrack-*'
```

### View detailed service logs:
```bash
# System-wide
sudo journalctl -u lifetrack-backend.service -n 100 --no-pager

# User-level
journalctl --user -u lifetrack-backend.service -n 100 --no-pager
```

### Check container status with Podman:
```bash
podman ps -a
podman logs lifetrack_backend
```

### Verify environment variables are loaded:
```bash
# System-wide
sudo systemctl show lifetrack-backend.service | grep Environment

# User-level
systemctl --user show lifetrack-backend.service | grep Environment
```

### Regenerate systemd units after changing Quadlet files:
```bash
# System-wide
sudo systemctl daemon-reload

# User-level
systemctl --user daemon-reload
```

## Advantages over docker-compose

1. **Native systemd integration**: Services start automatically on boot
2. **Better resource management**: Use systemd's cgroup controls
3. **Unified logging**: All logs accessible via journalctl
4. **Dependency management**: Automatic start/stop ordering
5. **Security**: Run rootless containers as user services
6. **Monitoring**: Integration with systemd monitoring tools

## Migration from docker-compose

To migrate from docker-compose:

1. Stop docker-compose services: `docker-compose down`
2. Build images with Podman (see step 1 above)
3. Install Quadlet files (see step 3 above)
4. Configure environment variables (see step 2 above)
5. Start services with systemctl (see step 4 above)

Data from docker volumes can be migrated manually if needed.

## Additional Resources

- [Podman Quadlet Documentation](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html)
- [systemd.unit Documentation](https://www.freedesktop.org/software/systemd/man/systemd.unit.html)
- [Podman Documentation](https://docs.podman.io/)
