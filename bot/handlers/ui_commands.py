"""
Command-based handlers for Telegram bot
Provides UI with buttons and menus instead of pure LLM
"""

import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

logger = logging.getLogger(__name__)


def get_user_client(context: ContextTypes.DEFAULT_TYPE):
    """Get authenticated GraphQL client for the user"""
    return context.user_data.get('gql_client')


def require_auth(func):
    """Decorator to require authentication for command handlers"""
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not context.user_data.get('auth_token'):
            await update.message.reply_text(
                "🔒 Please login first using /start"
            )
            return
        return await func(update, context)
    return wrapper


@require_auth
async def session(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Handle /session command - Unified session management and skills view
    Shows quick start/stop buttons + active session + skills list
    """
    gql_client = get_user_client(context)
    
    if not gql_client:
        await update.message.reply_text("❌ Error: Authentication issue. Please /logout and login again.")
        return
    
    # Fetch active session and skills separately to avoid timeout
    session_query = """
    query GetActiveSession {
        activeSession {
            id
            name
            status
            duration
            skill {
                id
                name
            }
        }
    }
    """
    
    skills_query = """
    query GetSkills {
        skills {
            id
            name
            level
        }
    }
    """
    
    try:
        # Fetch session first (usually faster)
        session_result = await gql_client.execute(session_query)
        active_session = session_result.get('activeSession')
        
        # Debug logging
        if active_session:
            logger.info(f"Active session found: {active_session.get('id')}, status: {active_session.get('status')}")
        else:
            logger.info("No active session")
        
        # Fetch skills
        try:
            skills_result = await gql_client.execute(skills_query)
            skills_list = skills_result.get('skills', [])
            logger.info(f"Skills count: {len(skills_list)}")
        except Exception as e:
            logger.warning(f"Failed to fetch skills: {e}")
            skills_list = []  # Continue without skills list
        
        message = ""
        keyboard = []
        
        # Quick action buttons at top
        if active_session:
            # Always show Stop button when there's an active session
            status = active_session.get('status', 'ACTIVE')
            
            if status == 'PAUSED':
                keyboard.append([
                    InlineKeyboardButton("▶️ Resume", callback_data=f"resume_session:{active_session['id']}"),
                    InlineKeyboardButton("⏹️ Stop", callback_data=f"stop_session:{active_session['id']}")
                ])
            else:
                # Default for ACTIVE or any other status
                keyboard.append([
                    InlineKeyboardButton("⏸️ Pause", callback_data=f"pause_session:{active_session['id']}"),
                    InlineKeyboardButton("⏹️ Stop", callback_data=f"stop_session:{active_session['id']}")
                ])
        else:
            # Show Start button only when no active session
            keyboard.append([
                InlineKeyboardButton("▶️ Start Session", callback_data="start_session_menu")
            ])
        
        # Show active session info if exists
        if active_session:
            skill_name = active_session['skill']['name']
            duration = active_session.get('duration', 0)
            status = active_session['status']
            active_skill_id = active_session['skill']['id']
            
            hours = duration // 60
            minutes = duration % 60
            duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
            
            status_emoji = "⏱️" if status == 'ACTIVE' else "⏸️"
            message = f"{status_emoji} **Active: {skill_name}** • {duration_str}\n\n"
            message += "━━━━━━━━━━━━━━━━━\n\n"
        else:
            active_skill_id = None
            message = "📭 No active session\n\n━━━━━━━━━━━━━━━━━\n\n"
        
        # Show skills list
        if not skills_list:
            message += "📚 **Skills**\n\nNo skills yet. Create skills in the web app!"
        else:
            message += f"📚 **All Skills** ({len(skills_list)})\n\n"
            
            for skill in skills_list[:8]:  # Limit to 8 for UI space
                level_emoji = {
                    'BEGINNER': '🌱',
                    'INTERMEDIATE': '🌿',
                    'ADVANCED': '🌳',
                    'EXPERT': '🏆'
                }.get(skill.get('level', ''), '📖')
                
                # Highlight currently active skill
                is_active = active_session and skill['id'] == active_skill_id
                skill_text = f"{level_emoji} {skill['name']}"
                if is_active:
                    skill_text += " ⚡"
                
                message += f"{skill_text}\n"
            
            if len(skills_list) > 8:
                message += f"\n_+{len(skills_list) - 8} more_"
            
            # Only show skill buttons if NO active session
            if not active_session:
                for skill in skills_list[:8]:
                    keyboard.append([
                        InlineKeyboardButton(
                            f"▶️ {skill['name']}", 
                            callback_data=f"quick_start:{skill['id']}"
                        )
                    ])
        
        logger.info(f"Keyboard has {len(keyboard)} button rows")
        reply_markup = InlineKeyboardMarkup(keyboard) if keyboard else None
        await update.message.reply_text(message, reply_markup=reply_markup, parse_mode='Markdown')
            
    except TimeoutError:
        logger.error("Timeout fetching session/skills data")
        await update.message.reply_text(
            "⏱️ **Request Timed Out**\n\n"
            "The backend is taking too long to respond.\n"
            "Please try again in a moment.",
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Error in session command: {e}", exc_info=True)
        await update.message.reply_text("❌ Error loading session/skills. Please try again.")


async def skills(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Handle /skills command - Alias for /session (unified view)
    """
    # Just redirect to session command
    await session(update, context)


@require_auth
async def schedule(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Handle /schedule command - Show today's schedule with navigation and event creation
    """
    gql_client = get_user_client(context)
    
    if not gql_client:
        await update.message.reply_text("❌ Error: Authentication issue. Please /logout and login again.")
        return
    
    from datetime import date, datetime
    
    today = date.today()
    
    query = """
    query GetEvents($startDate: Date!, $endDate: Date!) {
        events(startDate: $startDate, endDate: $endDate) {
            id
            title
            description
            startTime
            endTime
            type
            allDay
        }
    }
    """
    
    try:
        result = await gql_client.execute(query, {
            'startDate': today.isoformat(),
            'endDate': today.isoformat()
        })
        
        events = result.get('events', [])
        
        # Sort events by time
        sorted_events = sorted(events, key=lambda e: e.get('startTime', ''))
        
        message = f"📅 **{today.strftime('%A, %B %d, %Y')}**\n\n"
        
        if not sorted_events:
            message += "🌟 No events scheduled for today!\n\n"
            message += "_Add your first event using the buttons below._"
        else:
            for event in sorted_events:
                type_emoji = {
                    'ACTIVITY': '✅',
                    'MEETING': '👥',
                    'LEARNING': '📚',
                    'REMINDER': '🔔',
                    'CUSTOM': '📌'
                }.get(event.get('type', ''), '📌')
                
                title = event['title']
                start_time = event.get('startTime', '')
                all_day = event.get('allDay', False)
                
                if all_day:
                    message += f"{type_emoji} 🌅 **All Day** - {title}\n"
                elif start_time:
                    dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                    time_str = dt.strftime('%I:%M %p')
                    message += f"{type_emoji} **{time_str}** - {title}\n"
                else:
                    message += f"{type_emoji} {title}\n"
        
        # Navigation and action buttons
        keyboard = [
            [
                InlineKeyboardButton("◀️ Yesterday", callback_data="schedule:yesterday"),
                InlineKeyboardButton("Tomorrow ▶️", callback_data="schedule:tomorrow")
            ],
            [
                InlineKeyboardButton("📆 This Week", callback_data="schedule:week"),
                InlineKeyboardButton("📅 This Month", callback_data="schedule:month")
            ],
            [
                InlineKeyboardButton("➕ New Event", callback_data="event:create"),
                InlineKeyboardButton("📋 Event Templates", callback_data="event:templates")
            ]
        ]
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(message, reply_markup=reply_markup, parse_mode='Markdown')
        
    except TimeoutError:
        logger.error("Timeout fetching schedule")
        await update.message.reply_text(
            "⏱️ **Request Timed Out**\n\n"
            "Backend is taking too long. Try again shortly.",
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Error in schedule command: {e}", exc_info=True)
        await update.message.reply_text("❌ Error fetching schedule. Please try again.")


@require_auth
async def notes_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Handle /notes command - List recent notes with interactive UI
    """
    gql_client = get_user_client(context)
    
    if not gql_client:
        await update.message.reply_text("❌ Error: Authentication issue. Please /logout and login again.")
        return
    
    query = """
    query GetNotes($limit: Int!) {
        notes(limit: $limit) {
            nodes {
                id
                title
                content
                tags
                createdAt
            }
        }
    }
    """
    
    try:
        result = await gql_client.execute(query, {'limit': 10})
        notes_data = result.get('notes', {}).get('nodes', [])
        
        if not notes_data:
            message = "📝 **No Notes Yet**\n\nCreate your first note!"
            keyboard = [[
                InlineKeyboardButton("➕ Create Note", callback_data="note:create")
            ]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await update.message.reply_text(message, reply_markup=reply_markup, parse_mode='Markdown')
            return
        
        message = f"📝 **Recent Notes** ({len(notes_data)})\n\n"
        
        keyboard = []
        for i, note in enumerate(notes_data[:5]):
            title = note['title']
            tags = note.get('tags', [])
            tags_str = ' '.join(f'#{tag}' for tag in tags[:2]) if tags else ''
            
            # Truncate title if too long
            display_title = title[:35] + '...' if len(title) > 35 else title
            message += f"{i+1}. **{title}**"
            if tags_str:
                message += f" {tags_str}"
            message += "\n"
            
            # Add button for each note
            keyboard.append([InlineKeyboardButton(
                f"{i+1}. {display_title}",
                callback_data=f"note:view:{note['id']}"
            )])
        
        if len(notes_data) > 5:
            message += f"\n_...and {len(notes_data) - 5} more._\n"
        
        # Add action buttons
        keyboard.append([
            InlineKeyboardButton("➕ Create Note", callback_data="note:create"),
            InlineKeyboardButton("🔍 Search", callback_data="note:search")
        ])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(message, reply_markup=reply_markup, parse_mode='Markdown')
        
    except TimeoutError:
        logger.error("Timeout fetching notes")
        await update.message.reply_text(
            "⏱️ **Request Timed Out**\n\n"
            "Backend is taking too long. Try again shortly.",
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Error in notes command: {e}", exc_info=True)
        await update.message.reply_text("❌ Error fetching notes. Please try again.")


@require_auth
async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Handle /stats command - Show activity statistics
    """
    gql_client = get_user_client(context)
    
    if not gql_client:
        await update.message.reply_text("❌ Error: Authentication issue. Please /logout and login again.")
        return
    
    from datetime import date, timedelta
    
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    
    query = """
    query GetStats($startDate: Date!, $endDate: Date!) {
        activityStats(startDate: $startDate, endDate: $endDate) {
            totalActivities
            totalMinutes
            totalHours
            skillBreakdown {
                skillName
                activityCount
                totalHours
            }
        }
    }
    """
    
    try:
        # Get today's stats
        today_result = await gql_client.execute(query, {
            'startDate': today.isoformat(),
            'endDate': today.isoformat()
        })
        
        # Get week stats
        week_result = await gql_client.execute(query, {
            'startDate': week_start.isoformat(),
            'endDate': week_end.isoformat()
        })
        
        today_stats = today_result.get('activityStats', {})
        week_stats = week_result.get('activityStats', {})
        
        message = "📊 **Your Activity Stats**\n\n"
        
        # Today
        message += "**Today:**\n"
        message += f"• Activities: {today_stats.get('totalActivities', 0)}\n"
        message += f"• Time: {today_stats.get('totalHours', 0):.1f} hours\n\n"
        
        # This week
        message += "**This Week:**\n"
        message += f"• Activities: {week_stats.get('totalActivities', 0)}\n"
        message += f"• Time: {week_stats.get('totalHours', 0):.1f} hours\n\n"
        
        # Top skills this week
        skill_breakdown = week_stats.get('skillBreakdown', [])
        if skill_breakdown:
            message += "**Top Skills:**\n"
            for skill_stat in skill_breakdown[:3]:
                skill_name = skill_stat['skillName']
                hours = skill_stat['totalHours']
                message += f"• {skill_name}: {hours:.1f}h\n"
        
        # Period selector buttons
        keyboard = [
            [
                InlineKeyboardButton("Today", callback_data="stats:today"),
                InlineKeyboardButton("Week", callback_data="stats:week"),
                InlineKeyboardButton("Month", callback_data="stats:month")
            ]
        ]
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(message, reply_markup=reply_markup, parse_mode='Markdown')
        
    except TimeoutError:
        logger.error("Timeout fetching stats")
        await update.message.reply_text(
            "⏱️ **Request Timed Out**\n\n"
            "Backend is taking too long. Try again shortly.",
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Error in stats command: {e}", exc_info=True)
        await update.message.reply_text("❌ Error fetching stats. Please try again.")
