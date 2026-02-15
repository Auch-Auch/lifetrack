import logging
from telegram import Update
from telegram.ext import ContextTypes

logger = logging.getLogger(__name__)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command"""
    user = update.effective_user
    telegram_id = user.id
    
    # Check if user is already logged in
    if context.user_data.get('auth_token'):
        welcome_message = f"""
👋 Welcome back, {user.mention_html()}!

You're already connected to LifeTrack.

⚡ **Commands:**
• /session - Manage sessions & view skills
• /schedule - View your calendar
• /stats - Check your progress
• /notes - Access your notes
• /logout - Disconnect your account
• /help - Full command list
"""
        await update.message.reply_html(welcome_message)
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
    await update.message.reply_html(welcome_message)
    context.user_data['awaiting_email'] = True


async def link(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /link command to show Telegram connection status"""
    user = update.effective_user
    telegram_id = user.id
    telegram_username = user.username or user.first_name
    
    # Check if user is logged in
    gql_client = context.user_data.get('gql_client')
    if not gql_client:
        await update.message.reply_html(
            "🔒 <b>Not Logged In</b>\n\n"
            "Please use /start to login first.\n"
            "Your Telegram account will be automatically linked during login."
        )
        return
    
    # Check current user's telegram link status
    try:
        check_query = """
        query GetMe {
            me {
                id
                name
                email
                telegramId
            }
        }
        """
        
        result = await gql_client.execute(check_query)
        if result and result.get('me'):
            user_info = result['me']
            
            if user_info.get('telegramId'):
                await update.message.reply_html(
                    f"✅ <b>Already Connected!</b>\n\n"
                    f"Your Telegram account is linked to:\n"
                    f"👤 {user_info['name']}\n"
                    f"📧 {user_info['email']}\n"
                    f"🆔 Telegram ID: {user_info['telegramId']}\n\n"
                    f"You'll receive event reminders and notifications here!"
                )
            else:
                # Try to link now
                link_mutation = """
                mutation LinkTelegram($telegramId: Int!, $telegramUsername: String) {
                    linkTelegram(telegramId: $telegramId, telegramUsername: $telegramUsername) {
                        id
                        telegramId
                    }
                }
                """
                await gql_client.execute(link_mutation, {
                    "telegramId": telegram_id,
                    "telegramUsername": telegram_username
                })
                
                await update.message.reply_html(
                    f"✅ <b>Telegram Connected!</b>\n\n"
                    f"Your account has been linked.\n"
                    f"You'll now receive notifications here!"
                )
            return
    except Exception as e:
        logger.error(f"Error checking link status: {e}")
        await update.message.reply_text(
            "❌ Error checking connection status. Please try /logout and login again."
        )
        return


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
/help - This help
/logout - Disconnect account

💡 **Tip:** Use /session for everything related to learning sessions and skills!
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
        "Use /start to login again."
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
