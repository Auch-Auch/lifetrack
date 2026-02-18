import logging
from telegram import Update, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import ContextTypes

logger = logging.getLogger(__name__)


def get_main_keyboard():
    """Get the main command keyboard for authenticated users"""
    keyboard = [
        [KeyboardButton("/session"), KeyboardButton("/skills")],
        [KeyboardButton("/schedule"), KeyboardButton("/reminders")],
        [KeyboardButton("/notes"), KeyboardButton("/stats")],
        [KeyboardButton("/files"), KeyboardButton("/help")],
        [KeyboardButton("/logout")]
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True, is_persistent=True)


def get_login_keyboard():
    """Get a minimal keyboard for non-authenticated users"""
    keyboard = [
        [KeyboardButton("/start"), KeyboardButton("/help")]
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True, is_persistent=True)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command"""
    user = update.effective_user
    telegram_id = user.id
    
    # Check if user is already logged in
    if context.user_data.get('auth_token'):
        welcome_message = f"""
👋 Welcome back, {user.mention_html()}!

You're already connected to LifeTrack.

⚡ **Use the buttons below or type commands:**
• /session - Manage sessions & view skills
• /schedule - View your calendar
• /reminders - Manage reminders
• /notes - Access your notes
• /stats - Check your progress
• /logout - Disconnect your account
• /help - Full command list
"""
        await update.message.reply_html(welcome_message, reply_markup=get_main_keyboard())
        return
    
    # Ask user to login
    welcome_message = f"""
👋 Hi {user.mention_html()}!

Welcome to **LifeTrack Bot**! This bot allows you to:
• Track your learning sessions
• View your calendar and get notifications
• Create notes and check statistics

🔐 **To get started, please login:**
Send your email address to connect your account.

Example: `user@example.com`
"""
    await update.message.reply_html(welcome_message, reply_markup=get_login_keyboard())
    context.user_data['awaiting_email'] = True


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

/reminders - Manage reminders
• View upcoming & overdue
• Create new reminders
• Mark as complete

/notes - Recent notes
• View last 5 notes
• Quick preview

/stats - Progress dashboard
• Activity metrics
• Switch time periods
• Top skills breakdown

**� File System:**

/files - Browse your files
• Navigate directories
• View file listings
• Download files

/cd - Set current directory
• Example: /cd /documents/work
• All uploaded files go to current directory

**Upload files:**
• Send any document or photo
• Add caption: `/path/to/dir → description`
• Or use current directory from /cd

**📋 Aliases:**
/skills - Same as /session

**ℹ️ Other:**
/start - Welcome
/menu - Show command buttons
/timezone - Set your timezone
/help - This help
/logout - Disconnect account

💡 **Tip:** Use /timezone to set your timezone for accurate reminder times!
"""
    await update.message.reply_text(help_text, parse_mode='Markdown')


async def logout(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /logout command"""
    if not context.user_data.get('auth_token'):
        await update.message.reply_text("❌ You're not logged in.")
        return
    
    # Remove user from active users (for notifications)
    telegram_id = update.effective_user.id
    active_users = context.bot_data.get('active_users', {})
    if telegram_id in active_users:
        del active_users[telegram_id]
        logger.info(f"Removed user {telegram_id} from active users")
    
    # Clear user data
    context.user_data.clear()
    
    await update.message.reply_html(
        "👋 <b>Logged Out</b>\n\n"
        "You've been disconnected from your LifeTrack account.\n\n"
        "Use /start to login again.",
        reply_markup=get_login_keyboard()
    )


async def menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show the command menu keyboard"""
    if context.user_data.get('auth_token'):
        await update.message.reply_html(
            "📝 <b>Command Menu</b>\n\n"
            "Use the buttons below to quickly access commands:",
            reply_markup=get_main_keyboard()
        )
    else:
        await update.message.reply_html(
            "🔒 <b>Not Logged In</b>\n\n"
            "Please use /start to login first.",
            reply_markup=get_login_keyboard()
        )


async def timezone_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Set or view user's timezone"""
    if not context.user_data.get('auth_token'):
        await update.message.reply_text("🔒 Please login first using /start")
        return
    
    args = context.args
    
    if not args:
        # Show current timezone
        current_tz = context.user_data.get('timezone', 'UTC')
        await update.message.reply_html(
            f"🌍 <b>Your Timezone</b>\n\n"
            f"Current: <code>{current_tz}</code>\n\n"
            f"To change it, use:\n"
            f"<code>/timezone America/New_York</code>\n\n"
            f"Common timezones:\n"
            f"• <code>America/New_York</code> (EST/EDT)\n"
            f"• <code>America/Chicago</code> (CST/CDT)\n"
            f"• <code>America/Los_Angeles</code> (PST/PDT)\n"
            f"• <code>Europe/London</code> (GMT/BST)\n"
            f"• <code>Europe/Paris</code> (CET/CEST)\n"
            f"• <code>Asia/Tokyo</code> (JST)\n"
            f"• <code>Australia/Sydney</code> (AEST/AEDT)\n"
            f"• <code>Pacific/Auckland</code> (NZST/NZDT)"
        )
        return
    
    # Set timezone
    tz_name = args[0]
    try:
        from zoneinfo import ZoneInfo
        # Validate timezone
        ZoneInfo(tz_name)
        context.user_data['timezone'] = tz_name
        
        await update.message.reply_html(
            f"✅ <b>Timezone Updated</b>\n\n"
            f"Your timezone is now set to:\n"
            f"<code>{tz_name}</code>\n\n"
            f"This will be used for reminders and event times."
        )
    except Exception as e:
        await update.message.reply_html(
            f"❌ <b>Invalid Timezone</b>\n\n"
            f"'{tz_name}' is not a valid timezone.\n\n"
            f"Use format like: <code>America/New_York</code>\n"
            f"Full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones"
        )


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
