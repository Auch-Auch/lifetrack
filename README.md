# LifeTrack

> A comprehensive self-development tracking platform with skills management, activity logging, calendar events, and intelligent reminders - all accessible via web interface and Telegram bot.

## 🎯 Features

### Core Features
- **Skills Management**: Track and organize your learning skills
- **Activity Logging**: Record practice sessions with timer functionality
- **Calendar & Events**: Schedule and manage your learning activities
- **Reminders & Notifications**: Never miss important tasks with smart reminders
- **Learning Plans**: Create structured learning paths with automatic scheduling
- **Notes**: Document your journey with rich note-taking

### Reminders System (NEW)
- ✅ Independent reminders (work without events)
- ✅ Optional event linking
- ✅ Priority levels (LOW, MEDIUM, HIGH)
- ✅ Flexible repeat patterns (Daily, Weekly, Monthly, Yearly, Custom)
- ✅ Multi-channel notifications (Browser, Telegram, Email)
- ✅ Multiple reminder times per reminder
- ✅ Snooze functionality
- ✅ Tag-based organization
- ✅ Overdue tracking

### Tech Stack

**Frontend:**
- Next.js 16 (React 19)
- TypeScript
- Zustand (state management)
- URQL (GraphQL client)
- Tailwind CSS

**Backend:**
- Go
- gqlgen (GraphQL)
- PostgreSQL 16
- JWT authentication

**Infrastructure:**
- Caddy 2 (Reverse proxy, CORS, SSL/TLS)
- Docker & Docker Compose

**Bot:**
- Python 3.11
- aiogram (Telegram)
- llama-cpp-python (LLM)
- Qwen 2.5 Coder 7B

## 🚀 Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- 8GB+ RAM (for LLM bot)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd lifetrack
```

2. **Create environment configuration**
```bash
cp .env.example .env
# Edit .env with your secure values (see SECURITY.md for detailed guide)
```

**⚠️ Important:** Generate strong passwords and secrets:
```bash
# Generate PostgreSQL password
openssl rand -base64 32

# Generate JWT secret
openssl rand -hex 32
```

3. **Start the database first**
```bash
docker-compose up -d postgres
```

4. **Generate service JWT for the bot**
```bash
cd backend
JWT_SECRET=<your-jwt-secret> \
DATABASE_URL=postgres://<user>:<pass>@localhost:5432/lifetrack \
go run cmd/generate-service-token/main.go telegram-bot
# Copy the output and add to .env as SERVICE_JWT
```

5. **Start all services**
```bash
docker-compose up -d
```

6. **Access the application**
- **Application**: http://localhost (all traffic routed through Caddy)
- Backend and database are not directly exposed for security

## 📖 Documentation

- **[Security Guide](SECURITY.md)** ⭐ **START HERE** - Security setup and best practices
- [Deployment Guide](DEPLOYMENT.md) - Complete deployment and operations guide
- [Reminders Feature](backend/REMINDERS_FEATURE.md) - Detailed reminders system documentation
- [Backend README](backend/README.md) - Backend API documentation
- [Bot README](bot/README.md) - Telegram bot documentation

## 🎨 Screenshots

### Reminders Dashboard
![Reminders](docs/screenshots/reminders.png)

### Activity Tracking
![Activities](docs/screenshots/activities.png)

### Calendar View
![Calendar](docs/screenshots/calendar.png)

## 🔧 Development

### Frontend Development
```bash
cd lifetrack_front
npm install
npm run dev
# Access at http://localhost:3000
```

### Backend Development
```bash
cd backend
go mod download
./migrate.sh up
go run cmd/server/main.go
# Access at http://localhost:8080
```

### Bot Development
```bash
cd bot
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Users                               │
│                                                          │
│  Web Browser              Telegram App                  │
└──────┬───────────────────────────┬──────────────────────┘
       │                           │
       │                           │
       ▼                           ▼
┌──────────────────────────────────────────────────────────┐
│              Caddy Reverse Proxy                          │
│  (CORS, Security Headers, SSL/TLS, Rate Limiting)        │
│                    Port 80/443                           │
└───────┬──────────────────────────────────────────────────┘
        │
        ├───────────────────┬──────────────┐
        │                   │              │
        ▼                   ▼              ▼
┌─────────────┐    ┌──────────────┐  ┌──────────────┐
│   Frontend  │    │   Backend    │  │  Telegram    │
│  (Next.js)  │    │   GraphQL    │  │     Bot      │
│             │    │    (Go)      │  │  (Python)    │
└─────────────┘    └──────┬───────┘  └──────┬───────┘
                          │                  │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌────────────────┐
                          │   PostgreSQL   │
                          │   Database     │
                          │  (Internal)    │
                          └────────────────┘
```

**Security Benefits:**
- All external traffic goes through Caddy (single entry point)
- Backend and database not directly accessible
- Automatic HTTPS with Let's Encrypt (when configured)
- CORS properly restricted to allowed origins
- Security headers on all responses

## 🔐 Security

**Enhanced Security Features:**
- ✅ Caddy reverse proxy with automatic HTTPS
- ✅ No default passwords (all secrets required)
- ✅ JWT-based authentication
- ✅ Service-to-service authentication for bot
- ✅ Proper CORS configuration (restricted origins)
- ✅ Security headers (XSS, clickjacking, MIME sniffing protection)
- ✅ Database not exposed to host network
- ✅ Backend not directly accessible
- ✅ Rate limiting on authentication endpoints
- ✅ SSL/TLS support for database connections

**📖 See [SECURITY.md](SECURITY.md) for detailed security setup and best practices.**

## 📝 Environment Variables

**Required variables (no defaults for security):**

```bash
# Database
POSTGRES_DB=lifetrack
POSTGRES_USER=lifetrack
POSTGRES_PASSWORD=<generate-with-openssl-rand>

# Backend
JWT_SECRET=<generate-with-openssl-rand>
SERVICE_JWT=<generate-with-backend-tool>

# Bot
TELEGRAM_BOT_TOKEN=<get-from-botfather>

# Caddy/CORS
ALLOWED_ORIGINS=http://localhost:3000  # Change for production
NEXT_PUBLIC_API_URL=/query

# Optional
MODEL_N_THREADS=8
MODEL_N_GPU_LAYERS=0
ENV=production
```

**⚠️ See [SECURITY.md](SECURITY.md) for detailed setup instructions and security best practices.**

## 🧪 Testing

```bash
# Backend tests
cd backend
go test ./...

# Frontend tests
cd lifetrack_front
npm test

# Integration tests
cd backend
go test -tags=integration ./...
```

## 📈 Monitoring

### Health Checks

```bash
# Backend
curl http://localhost:8080/health

# Frontend
curl http://localhost:3000

# Database
docker-compose exec postgres pg_isready
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f bot
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [gqlgen](https://github.com/99designs/gqlgen) - GraphQL server library for Go
- [Next.js](https://nextjs.org/) - React framework
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Qwen 2.5 Coder](https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF) - LLM model
- [aiogram](https://github.com/aiogram/aiogram) - Telegram Bot framework

## 📧 Contact

For questions and support, please open an issue on GitHub.

---

Made with ❤️ by the LifeTrack Team
