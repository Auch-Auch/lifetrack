from telegram import Update
from telegram.ext import ContextTypes


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command"""
    user = update.effective_user
    welcome_message = f"""
👋 Hi {user.mention_html()}!

Welcome to **LifeTrack Bot**! Track your learning journey with quick, visual controls.

⚡ **Commands:**
• /session - Manage sessions & view skills
• /schedule - View your calendar
• /stats - Check your progress
• /notes - Access your notes
• /help - Full command list

🚀 **Try /session to get started!**
"""
    await update.message.reply_html(welcome_message)


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /help command"""
    help_text = """
📚 **LifeTrack Bot Commands**

**🎮 Main Commands:**

/session - Unified session & skills view
• View active session with controls
• Browse all your skills
• Quick-start any skill with one tap
• Pause/resume/stop active sessions

/schedule - Calendar view
• Today's events
• Navigate days/weeks
• Event type indicators

/stats - Progress dashboard
• Activity metrics
• Switch time periods
• Top skills breakdown

/notes - Recent notes
• View last 5 notes
• Quick preview

**📋 Aliases:**
/skills - Same as /session

**ℹ️ Other:**
/start - Welcome
/help - This help

💡 **Tip:** Use /session for everything related to learning sessions and skills!
"""
    await update.message.reply_text(help_text, parse_mode='Markdown')


async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /stats command"""
    # TODO: Fetch real stats from backend
    stats_message = """
📊 **Your Stats**

**Today:**
• Activities: 0
• Time: 0 minutes
• Notes: 0

**This Week:**
• Activities: 0
• Time: 0 hours
• Notes: 0

**This Month:**
•  Activities: 0
• Time: 0 hours
• Learning Plans: 0

Use the web app for detailed analytics!
"""
    await update.message.reply_text(stats_message, parse_mode='Markdown')
