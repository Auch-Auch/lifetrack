# LifeTrack Telegram Bot

**Command-based** Telegram bot for LifeTrack with visual menus, inline buttons, and instant responses.

## Features

- **⚡ Fast Command-Based UI** - Instant responses with buttons and menus
- **🎯 Visual Interaction** - Inline keyboards for all major features
- **🔗 Direct GraphQL Integration** - No LLM overhead
- **📱 Mobile-Optimized** - Touch-friendly interface

### Capabilities

- **Session Management** (`/session`)
  - Start/pause/resume/stop learning sessions
  - Visual skill selection
  - Session status with controls
  
- **Skills Browser** (`/skills`)
  - List all skills with level indicators
  - Quick-start sessions with one tap
  - Visual skill organization
  
- **Schedule View** (`/schedule`)
  - Daily event calendar
  - Navigate days/weeks with buttons
  - Event type indicators
  
- **Statistics Dashboard** (`/stats`)
  - Activity metrics (today/week/month)
  - Period selection buttons
  - Top skills breakdown
  
- **Notes Access** (`/notes`)
  - Recent notes preview
  - Tag display
  - Quick access

## Architecture

### Command-Based Flow

```
User Command → Button Press → GraphQL Query → Backend → Response
            (~100ms total)
```

**Benefits:**
- ✅ Fast response (< 1s vs 2-4s with LLM)
- ✅ Reliable (100% predictable behavior)
- ✅ Visual guidance (clear options)
- ✅ Lower resource usage (no model loading)
- ✅ Easier testing (deterministic)

## Tech Stack

- **Python 3.11+**
- **python-telegram-bot v20+** - Telegram Bot API wrapper
- **gql[all]** - GraphQL client
- **python-dotenv** - Environment configuration

### Archived: LLM Components

The previous LLM-based natural language interface has been archived to `archived_llm/`. It included RAG-based GraphQL generation with FAISS and llama-cpp-python. See [archived_llm/README.md](archived_llm/README.md) for details and restoration instructions.

## Setup

### Prerequisites

```bash
# Python 3.11+
python --version

# Virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

**Core dependencies:**
- `python-telegram-bot>=20.0`
- `gql[all]>=3.0`
- `python-dotenv`

### Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
```

Required environment variables:
- `TELEGRAM_BOT_TOKEN` - Get from @BotFather on Telegram
- `BACKEND_URL` - GraphQL endpoint (e.g., http://localhost:8080/graphql)
- `SERVICE_JWT` - Service account JWT from backend

## Usage

### Run Bot

```bash
python main.py
```

Expected startup:
```
Initializing GraphQL client...
Bot initialization complete (command-based UI mode)
Starting bot...
```

### Commands

#### /start
Welcome message with command overview

#### /help
Complete command reference and feature guide

#### /session
Session management interface:
- Check current session status
- Start new session (skill selector)
- Pause/Resume/Stop with buttons

#### /skills
Skills browser:
- View all skills with levels (🌱🌿🌳🏆)
- Quick-start sessions

#### /schedule
Calendar view:
- Today's events
- Navigation: yesterday/tomorrow/week
- Event type indicators (✅👥📚🏠)

#### /stats
Statistics dashboard:
- Activity metrics
- Period selection (today/week/month)
- Top skills breakdown

#### /notes
Recent notes:
- Last 5 notes
- Tags preview
- Quick access

### Example Workflows

**Starting a Session:**
1. Send `/session`
2. Click "▶️ Start Session"
3. Select skill from list
4. Session starts automatically ✅

**Checking Schedule:**
1. Send `/schedule`
2. View today's events
3. Click navigation buttons for other days

**Viewing Stats:**
1. Send `/stats`
2. See today + week summary
3. Click period buttons to switch

**Managing Skills:**
1. Send `/skills`
2. Browse skills with levels
3. Tap any skill to start session

## Architecture

```
User Message
    ↓
Telegram Bot Handler
    ↓
LLM Intent Parser (llama.cpp)
    ↓
Structured Intent JSON
    ↓
GraphQL Query Builder
    ↓
Backend API
    ↓
Response Formatter
    ↓
Telegram Reply
```

## Project Structure

```
bot/
├── main.py                      # Entry point
├── config.py                    # Configuration
├── handlers/
│   ├── commands.py              # /start, /help
│   ├── ui_commands.py           # /session, /skills, /schedule, /stats, /notes
│   └── callbacks.py             # Button interaction handlers
├── backend_client/
│   └── simple_client.py         # GraphQL client
├── schemas/
│   └── graphql_examples.yaml    # GraphQL examples (reference)
├── archived_llm/                # Archived LLM components
│   ├── README.md               # Restoration instructions
│   ├── llm/                    # LLM modules
│   ├── handlers/               # Natural language handler
│   ├── schemas/                # Prompt templates
│   ├── tests/                  # LLM tests
│   └── docs/                   # LLM documentation
└── requirements.txt
```

## Adding New Commands

1. **Create handler** in `handlers/ui_commands.py`:
```python
async def my_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    gql_client = context.bot_data.get('gql_client')
    # Your logic here
    await update.message.reply_text("Response")
```

2. **Register handler** in `main.py`:
```python
application.add_handler(CommandHandler("mycommand", ui_commands.my_command))
```

3. **Add callback** (for buttons) in `handlers/callbacks.py`:
```python
# In handle_callback():
elif callback_data.startswith("my_action:"):
    await handle_my_action(update, context, callback_data)
```

## Development

### Testing Commands

```bash
# Start bot
python main.py

# In Telegram, test:
/start
/session
/skills
/schedule
/stats
/notes
```

### Debugging

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

Check GraphQL queries:
```python
# Add to any handler
logger.info(f"Query: {query}")
logger.info(f"Variables: {variables}")
```

## Deployment

### Docker

```bash
docker build -t lifetrack-bot .
docker run -d --env-file .env lifetrack-bot
```

### System Requirements

- **RAM:** 256MB (minimal, no LLM)
- **CPU:** 1 core sufficient
- **Storage:** < 100MB

### Production Checklist

- [ ] Secure TELEGRAM_BOT_TOKEN
- [ ] Use HTTPS for webhook (if not using polling)
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Test all intent parsings (>95% accuracy target)
- [ ] Implement error recovery and retries
- [ ] Set up health checks
- [ ] Monitor LLM inference latency

## Troubleshooting

**Model loading errors:**
- Ensure model file exists at MODEL_PATH
- Check file permissions
- Verify GGUF format compatibility

**GraphQL errors:**
- Verify BACKEND_URL is correct
- Check SERVICE_JWT is valid
- Ensure backend is running

**Intent parsing issues:**
- Check MODEL_TEMPERATURE (should be 0 for deterministic output)
- Review intent_schema.json for ambiguities
- Add more examples to schema descriptions

## License

Part of the LifeTrack project.
