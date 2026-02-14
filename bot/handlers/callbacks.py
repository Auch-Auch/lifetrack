"""
Callback query handlers for inline button interactions
"""

import logging
from datetime import date, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, ConversationHandler
from gql.transport.exceptions import TransportQueryError

logger = logging.getLogger(__name__)

# Conversation states
SELECTING_SKILL, ENTERING_SESSION_NAME = range(2)


def get_user_client(context: ContextTypes.DEFAULT_TYPE):
    """Get authenticated GraphQL client for the user"""
    return context.user_data.get('gql_client')


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Main callback handler for all inline button presses
    Routes to specific handlers based on callback_data
    """
    query = update.callback_query
    await query.answer()  # Acknowledge the button press
    
    # Check authentication
    if not context.user_data.get('auth_token'):
        await query.edit_message_text("🔒 Session expired. Please /start to login again.")
        return
    
    callback_data = query.data
    gql_client = get_user_client(context)
    
    if not gql_client:
        await query.edit_message_text("❌ Authentication error. Please /logout and login again.")
        return
    
    # Route to specific handlers
    if callback_data == "cancel":
        await query.edit_message_text("❌ Cancelled. Use /session to try again.")
    elif callback_data == "start_session_menu":
        await show_skill_selection(update, context)
    elif callback_data.startswith("start_skill:") or callback_data.startswith("quick_start:"):
        await start_session_for_skill(update, context, callback_data)
    elif callback_data.startswith("pause_session:"):
        await pause_session(update, context, callback_data)
    elif callback_data.startswith("resume_session:"):
        await resume_session(update, context, callback_data)
    elif callback_data.startswith("stop_session:"):
        await stop_session(update, context, callback_data)
    elif callback_data.startswith("schedule:"):
        await handle_schedule_navigation(update, context, callback_data)
    elif callback_data.startswith("stats:"):
        await handle_stats_period(update, context, callback_data)
    elif callback_data.startswith("note:"):
        await handle_note_action(update, context, callback_data)
    elif callback_data.startswith("event:"):
        await handle_event_action(update, context, callback_data)
    else:
        await query.edit_message_text(f"Unknown action: {callback_data}")


async def show_skill_selection(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Show list of skills to select for starting a session
    """
    query = update.callback_query
    gql_client = get_user_client(context)
    
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
        result = await gql_client.execute(skills_query)
        skills = result.get('skills', [])
        
        if not skills:
            await query.edit_message_text(
                "📚 **No Skills Available**\n\nCreate skills in the web app first!",
                parse_mode='Markdown'
            )
            return
        
        message = "📚 **Select a Skill**\n\nChoose which skill you want to practice:"
        
        keyboard = []
        for skill in skills[:10]:  # Limit to 10
            level_emoji = {
                'BEGINNER': '🌱',
                'INTERMEDIATE': '🌿',
                'ADVANCED': '🌳',
                'EXPERT': '🏆'
            }.get(skill.get('level', ''), '📖')
            
            keyboard.append([
                InlineKeyboardButton(
                    f"{level_emoji} {skill['name']}", 
                    callback_data=f"start_skill:{skill['id']}"
                )
            ])
        
        keyboard.append([InlineKeyboardButton("❌ Cancel", callback_data="cancel")])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
        
    except Exception as e:
        logger.error(f"Error showing skill selection: {e}", exc_info=True)
        await query.edit_message_text("❌ Error loading skills. Try /skills command.")


async def start_session_for_skill(update: Update, context: ContextTypes.DEFAULT_TYPE, callback_data: str) -> None:
    """
    Start a new session for the selected skill
    """
    query = update.callback_query
    gql_client = get_user_client(context)
    
    # Extract skill ID from callback_data (works for both start_skill: and quick_start:)
    skill_id = callback_data.split(':')[1]
    
    # Get skill details
    skill_query = """
    query GetSkill($id: UUID!) {
        skill(id: $id) {
            id
            name
        }
    }
    """
    
    # Start session mutation
    start_mutation = """
    mutation StartSession($skillId: UUID!, $name: String!) {
        startSession(skillId: $skillId, name: $name) {
            id
            name
            status
            startedAt
        }
    }
    """
    
    try:
        # Get skill name
        skill_result = await gql_client.execute(skill_query, {'id': skill_id})
        skill = skill_result.get('skill')
        
        if not skill:
            await query.edit_message_text("❌ Skill not found.")
            return
        
        skill_name = skill['name']
        session_name = f"{skill_name} practice"
        
        # Start the session
        session_result = await gql_client.execute(start_mutation, {
            'skillId': skill_id,
            'name': session_name
        })
        
        session = session_result.get('startSession')
        
        if session:
            message = f"✅ **Session Started!**\n\n"
            message += f"📚 {skill_name}\n"
            message += f"⏱️ Timer running...\n\n"
            message += f"Use /session to pause or stop."
            
            await query.edit_message_text(message, parse_mode='Markdown')
        else:
            await query.edit_message_text("❌ Failed to start session.")
            
    except TimeoutError:
        logger.error("Timeout starting session")
        await query.edit_message_text(
            "⏱️ **Request Timed Out**\n\n"
            "Backend is taking too long. Try again shortly.",
            parse_mode='Markdown'
        )
    except TransportQueryError as e:
        # Handle GraphQL-specific errors
        error_data = e.errors[0] if e.errors else {}
        error_msg = error_data.get('message', str(e))
        logger.error(f"GraphQL error starting session: {error_msg}")
        
        if "already have an active session" in error_msg.lower():
            await query.edit_message_text(
                "⚠️ **Session Already Active**\n\n"
                "Stop your current session first.\n\n"
                "Use /session to manage it.",
                parse_mode='Markdown'
            )
        else:
            await query.edit_message_text(f"❌ Error: {error_msg[:200]}")
            
    except Exception as e:
        logger.error(f"Error starting session: {e}", exc_info=True)
        await query.edit_message_text(f"❌ Unexpected error. Please try /session again.")


async def pause_session(update: Update, context: ContextTypes.DEFAULT_TYPE, callback_data: str) -> None:
    """
    Pause the active session
    """
    query = update.callback_query
    gql_client = get_user_client(context)
    
    session_id = callback_data.split(':')[1]
    
    mutation = """
    mutation PauseSession($id: UUID!) {
        pauseSession(id: $id) {
            id
            status
        }
    }
    """
    
    try:
        result = await gql_client.execute(mutation, {'id': session_id})
        
        if result.get('pauseSession'):
            await query.edit_message_text(
                "⏸️ **Session Paused**\n\nUse /session to resume or stop.",
                parse_mode='Markdown'
            )
        else:
            await query.edit_message_text("❌ Failed to pause session.")
            
    except TimeoutError:
        logger.error("Timeout pausing session")
        await query.edit_message_text(
            "⏱️ **Request Timed Out**\n\n"
            "Backend is taking too long. Try again shortly.",
            parse_mode='Markdown'
        )
    except TransportQueryError as e:
        error_data = e.errors[0] if e.errors else {}
        error_msg = error_data.get('message', str(e))
        logger.error(f"GraphQL error pausing session: {error_msg}")
        
        if "not found" in error_msg.lower():
            await query.edit_message_text(
                "⚠️ Session not found. It may have been stopped.\n\nUse /session to check.",
                parse_mode='Markdown'
            )
        else:
            await query.edit_message_text(f"❌ Error: {error_msg[:150]}")
            
    except Exception as e:
        logger.error(f"Error pausing session: {e}", exc_info=True)
        await query.edit_message_text("❌ Unexpected error. Use /session to check status.")


async def resume_session(update: Update, context: ContextTypes.DEFAULT_TYPE, callback_data: str) -> None:
    """
    Resume a paused session
    """
    query = update.callback_query
    gql_client = get_user_client(context)
    
    session_id = callback_data.split(':')[1]
    
    mutation = """
    mutation ResumeSession($id: UUID!) {
        resumeSession(id: $id) {
            id
            status
        }
    }
    """
    
    try:
        result = await gql_client.execute(mutation, {'id': session_id})
        
        if result.get('resumeSession'):
            await query.edit_message_text(
                "▶️ **Session Resumed**\n\nTimer is running. Use /session for controls.",
                parse_mode='Markdown'
            )
        else:
            await query.edit_message_text("❌ Failed to resume session.")
            
    except TimeoutError:
        logger.error("Timeout resuming session")
        await query.edit_message_text(
            "⏱️ **Request Timed Out**\n\n"
            "Backend is taking too long. Try again shortly.",
            parse_mode='Markdown'
        )
    except TransportQueryError as e:
        error_data = e.errors[0] if e.errors else {}
        error_msg = error_data.get('message', str(e))
        logger.error(f"GraphQL error resuming session: {error_msg}")
        
        if "not found" in error_msg.lower():
            await query.edit_message_text(
                "⚠️ Session not found. It may have been stopped.\n\nUse /session to check.",
                parse_mode='Markdown'
            )
        else:
            await query.edit_message_text(f"❌ Error: {error_msg[:150]}")
            
    except Exception as e:
        logger.error(f"Error resuming session: {e}", exc_info=True)
        await query.edit_message_text("❌ Unexpected error. Use /session to check status.")


async def stop_session(update: Update, context: ContextTypes.DEFAULT_TYPE, callback_data: str) -> None:
    """
    Stop the active session
    """
    query = update.callback_query
    gql_client = get_user_client(context)
    
    session_id = callback_data.split(':')[1]
    
    mutation = """
    mutation StopSession($id: UUID!) {
        stopSession(id: $id) {
            id
            status
            duration
        }
    }
    """
    
    try:
        result = await gql_client.execute(mutation, {'id': session_id})
        session = result.get('stopSession')
        
        if session:
            duration = session.get('duration', 0)
            hours = duration // 60
            minutes = duration % 60
            duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
            
            message = f"⏹️ **Session Completed**\n\n"
            message += f"⏱️ Duration: {duration_str}\n\n"
            message += f"✨ Great work! Use /session to start another."
            
            await query.edit_message_text(message, parse_mode='Markdown')
        else:
            await query.edit_message_text("❌ Failed to stop session.")
            
    except TimeoutError:
        logger.error("Timeout stopping session")
        await query.edit_message_text(
            "⏱️ **Request Timed Out**\n\n"
            "Backend is taking too long. Try again shortly.",
            parse_mode='Markdown'
        )
    except TransportQueryError as e:
        error_data = e.errors[0] if e.errors else {}
        error_msg = error_data.get('message', str(e))
        logger.error(f"GraphQL error stopping session: {error_msg}")
        
        if "not found" in error_msg.lower():
            await query.edit_message_text(
                "⚠️ Session not found. It may have already been stopped.\n\n"
                "Use /session to check status.",
                parse_mode='Markdown'
            )
        else:
            await query.edit_message_text(f"❌ Error: {error_msg[:150]}")
            
    except Exception as e:
        logger.error(f"Error stopping session: {e}", exc_info=True)
        await query.edit_message_text("❌ Unexpected error. Use /session to check status.")


async def handle_schedule_navigation(update: Update, context: ContextTypes.DEFAULT_TYPE, callback_data: str) -> None:
    """
    Handle schedule navigation (yesterday/tomorrow/week/month)
    """
    query = update.callback_query
    gql_client = get_user_client(context)
    
    action = callback_data.split(':')[1]
    
    # Calculate dates based on action
    today = date.today()
    if action == "yesterday":
        target_date = today - timedelta(days=1)
        end_date = target_date
    elif action == "tomorrow":
        target_date = today + timedelta(days=1)
        end_date = target_date
    elif action == "today":
        target_date = today
        end_date = today
    elif action == "week":
        week_start = today - timedelta(days=today.weekday())
        target_date = week_start
        end_date = week_start + timedelta(days=6)
    elif action == "month":
        target_date = today.replace(day=1)
        # Get last day of month
        next_month = today.replace(day=28) + timedelta(days=4)
        end_date = next_month - timedelta(days=next_month.day)
    else:
        target_date = today
        end_date = today
    
    events_query = """
    query GetEvents($startDate: Date!, $endDate: Date!) {
        events(startDate: $startDate, endDate: $endDate) {
            id
            title
            startTime
            endTime
            type
            allDay
        }
    }
    """
    
    try:
        result = await gql_client.execute(events_query, {
            'startDate': target_date.isoformat(),
            'endDate': end_date.isoformat()
        })
        
        events = result.get('events', [])
        
        # Sort events by time
        sorted_events = sorted(events, key=lambda e: e.get('startTime', ''))
        
        if action == "week":
            message = f"📅 **Week of {target_date.strftime('%B %d')}**\n\n"
        elif action == "month":
            message = f"📅 **{target_date.strftime('%B %Y')}**\n\n"
        else:
            message = f"📅 **{target_date.strftime('%A, %B %d, %Y')}**\n\n"
        
        if not sorted_events:
            message += "🌟 No events scheduled!\n"
        else:
            for event in sorted_events[:15]:  # Show more for week/month
                type_emoji = {
                    'ACTIVITY': '✅',
                    'MEETING': '👥',
                    'LEARNING': '📚',
                    'REMINDER': '🔔',
                    'CUSTOM': '📌'
                }.get(event.get('type', ''), '📌')
                
                title = event['title']
                start_time = event.get('startTime')
                all_day = event.get('allDay', False)
                
                if all_day:
                    message += f"{type_emoji} 🌅 **All Day** - {title}\n"
                elif start_time:
                    from datetime import datetime
                    dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                    if action in ["week", "month"]:
                        date_str = dt.strftime('%m/%d')
                        time_str = dt.strftime('%I:%M %p')
                        message += f"{type_emoji} {date_str} **{time_str}** - {title}\n"
                    else:
                        time_str = dt.strftime('%I:%M %p')
                        message += f"{type_emoji} **{time_str}** - {title}\n"
                else:
                    message += f"{type_emoji} {title}\n"
            
            if len(sorted_events) > 15:
                message += f"\n_...and {len(sorted_events) - 15} more events._\n"
        
        # Navigation buttons
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
                InlineKeyboardButton("⏺️ Today", callback_data="schedule:today"),
                InlineKeyboardButton("➕ New Event", callback_data="event:create")
            ]
        ]
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
        
    except Exception as e:
        logger.error(f"Error navigating schedule: {e}", exc_info=True)
        await query.edit_message_text("❌ Error loading schedule.")


async def handle_stats_period(update: Update, context: ContextTypes.DEFAULT_TYPE, callback_data: str) -> None:
    """
    Handle stats period selection (today/week/month)
    """
    query = update.callback_query
    gql_client = get_user_client(context)
    
    period = callback_data.split(':')[1]
    
    today = date.today()
    
    if period == "today":
        start_date = today
        end_date = today
        period_label = "Today"
    elif period == "week":
        start_date = today - timedelta(days=today.weekday())
        end_date = start_date + timedelta(days=6)
        period_label = "This Week"
    elif period == "month":
        start_date = today.replace(day=1)
        # Get last day of month
        next_month = today.replace(day=28) + timedelta(days=4)
        end_date = (next_month - timedelta(days=next_month.day))
        period_label = "This Month"
    else:
        start_date = today
        end_date = today
        period_label = "Today"
    
    stats_query = """
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
        result = await gql_client.execute(stats_query, {
            'startDate': start_date.isoformat(),
            'endDate': end_date.isoformat()
        })
        
        stats = result.get('activityStats', {})
        
        message = f"📊 **Stats: {period_label}**\n\n"
        message += f"• Activities: {stats.get('totalActivities', 0)}\n"
        message += f"• Time: {stats.get('totalHours', 0):.1f} hours\n\n"
        
        # Top skills
        skill_breakdown = stats.get('skillBreakdown', [])
        if skill_breakdown:
            message += "**Top Skills:**\n"
            for skill_stat in skill_breakdown[:5]:
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
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
        
    except Exception as e:
        logger.error(f"Error loading stats: {e}", exc_info=True)
        await query.edit_message_text("❌ Error loading stats.")


# ======== Note Handlers ========

async def handle_note_action(update: Update, context: ContextTypes.DEFAULT_TYPE, callback_data: str) -> int:
    """
    Handle note-related actions
    """
    query = update.callback_query
    gql_client = get_user_client(context)
    
    parts = callback_data.split(':')
    action = parts[1]
    
    if action == "create":
        await query.edit_message_text(
            "📝 **Create New Note**\n\n"
            "Please send your note in this format:\n\n"
            "`Title\nContent\n#tag1 #tag2`\n\n"
            "Example:\n"
            "`Meeting Notes\nDiscussed Q1 goals\n#work #meeting`\n\n"
            "Or just send a simple message and I'll create a note from it.",
            parse_mode='Markdown'
        )
        context.user_data['awaiting_note'] = True
        return ConversationHandler.END
        
    elif action == "list":
        await show_notes_list(update, context)
        
    elif action == "view":
        note_id = parts[2]
        await show_note_detail(update, context, note_id)
        
    elif action == "delete":
        note_id = parts[2]
        await delete_note(update, context, note_id)
        
    elif action == "search":
        await query.edit_message_text(
            "🔍 **Search Notes**\n\n"
            "Send me keywords to search your notes.",
            parse_mode='Markdown'
        )
        context.user_data['awaiting_note_search'] = True
        return ConversationHandler.END


async def show_notes_list(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Show list of notes
    """
    query = update.callback_query
    gql_client = get_user_client(context)
    
    notes_query = """
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
        result = await gql_client.execute(notes_query, {'limit': 10})
        notes_data = result.get('notes', {}).get('nodes', [])
        
        if not notes_data:
            message = "📝 **No Notes Yet**\n\nCreate your first note!"
            keyboard = [[
                InlineKeyboardButton("➕ Create Note", callback_data="note:create")
            ]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
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
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
        
    except Exception as e:
        logger.error(f"Error showing notes list: {e}", exc_info=True)
        await query.edit_message_text("❌ Error loading notes.")


async def show_note_detail(update: Update, context: ContextTypes.DEFAULT_TYPE, note_id: str) -> None:
    """
    Show detailed view of a note
    """
    query = update.callback_query
    gql_client = get_user_client(context)
    
    note_query = """
    query GetNote($id: UUID!) {
        note(id: $id) {
            id
            title
            content
            tags
            createdAt
            updatedAt
        }
    }
    """
    
    try:
        result = await gql_client.execute(note_query, {'id': note_id})
        note = result.get('note')
        
        if not note:
            await query.edit_message_text("❌ Note not found.")
            return
        
        title = note['title']
        content = note['content']
        tags = note.get('tags', [])
        created_at = note.get('createdAt', '')
        
        # Truncate content if too long
        if len(content) > 500:
            content = content[:500] + "..."
        
        message = f"📝 **{title}**\n\n"
        message += f"{content}\n\n"
        
        if tags:
            tags_str = ' '.join(f'#{tag}' for tag in tags)
            message += f"🏷️ {tags_str}\n\n"
        
        if created_at:
            from datetime import datetime
            try:
                dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                message += f"📅 Created: {dt.strftime('%B %d, %Y at %I:%M %p')}\n"
            except:
                pass
        
        keyboard = [
            [
                InlineKeyboardButton("🗑️ Delete", callback_data=f"note:delete:{note_id}"),
                InlineKeyboardButton("« Back", callback_data="note:list")
            ]
        ]
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
        
    except Exception as e:
        logger.error(f"Error showing note detail: {e}", exc_info=True)
        await query.edit_message_text("❌ Error loading note.")


async def delete_note(update: Update, context: ContextTypes.DEFAULT_TYPE, note_id: str) -> None:
    """
    Delete a note
    """
    query = update.callback_query
    gql_client = get_user_client(context)
    
    mutation = """
    mutation DeleteNote($id: UUID!) {
        deleteNote(id: $id)
    }
    """
    
    try:
        await gql_client.execute(mutation, {'id': note_id})
        await query.edit_message_text(
            "✅ **Note Deleted**\n\n"
            "The note has been removed.\n\n"
            "Use /notes to view your remaining notes.",
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Error deleting note: {e}", exc_info=True)
        await query.edit_message_text("❌ Error deleting note.")


# ======== Event Handlers ========

async def handle_event_action(update: Update, context: ContextTypes.DEFAULT_TYPE, callback_data: str) -> int:
    """
    Handle event-related actions
    """
    query = update.callback_query
    gql_client = get_user_client(context)
    
    parts = callback_data.split(':')
    action = parts[1]
    
    if action == "create":
        await query.edit_message_text(
            "📅 **Create New Event**\n\n"
            "Please send your event in this format:\n\n"
            "`Title\nDate Time (YYYY-MM-DD HH:MM)\nDuration (minutes)\nType (LEARNING/MEETING/REMINDER)`\n\n"
            "Example:\n"
            "`Team Meeting\n2026-02-13 14:00\n60\nMEETING`\n\n"
            "Or use templates below:",
            parse_mode='Markdown'
        )
        context.user_data['awaiting_event'] = True
        return ConversationHandler.END
        
    elif action == "templates":
        await show_event_templates(update, context)
        
    elif action == "template":
        template_type = parts[2]
        await create_event_from_template(update, context, template_type)
        
    elif action == "view":
        event_id = parts[2]
        await show_event_detail(update, context, event_id)
        
    elif action == "delete":
        event_id = parts[2]
        await delete_event(update, context, event_id)


async def show_event_templates(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Show quick event templates
    """
    query = update.callback_query
    
    message = "📋 **Event Templates**\n\n"
    message += "Choose a template to quickly create an event:\n\n"
    message += "⏰ **Quick Meeting** - 30 min meeting starting now\n"
    message += "📚 **Study Session** - 1 hour learning session\n"
    message += "🔔 **Reminder** - Quick reminder for later today\n"
    
    keyboard = [
        [InlineKeyboardButton("⏰ Quick Meeting", callback_data="event:template:meeting")],
        [InlineKeyboardButton("📚 Study Session", callback_data="event:template:study")],
        [InlineKeyboardButton("🔔 Reminder", callback_data="event:template:reminder")],
        [InlineKeyboardButton("« Back", callback_data="schedule:today")]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')


async def create_event_from_template(update: Update, context: ContextTypes.DEFAULT_TYPE, template_type: str) -> None:
    """
    Create an event from a template
    """
    query = update.callback_query
    gql_client = get_user_client(context)
    
    from datetime import datetime, timedelta
    
    now = datetime.now()
    
    if template_type == "meeting":
        title = "Team Meeting"
        start_time = now
        end_time = now + timedelta(minutes=30)
        event_type = "MEETING"
        
    elif template_type == "study":
        title = "Study Session"
        start_time = now
        end_time = now + timedelta(hours=1)
        event_type = "LEARNING"
        
    elif template_type == "reminder":
        title = "Reminder"
        start_time = now + timedelta(hours=2)
        end_time = now + timedelta(hours=2, minutes=15)
        event_type = "REMINDER"
    else:
        await query.edit_message_text("❌ Invalid template type.")
        return
    
    # Ask for title customization
    await query.edit_message_text(
        f"📅 **Creating {title}**\n\n"
        f"Start: {start_time.strftime('%I:%M %p')}\n"
        f"End: {end_time.strftime('%I:%M %p')}\n"
        f"Type: {event_type}\n\n"
        "Send a custom title, or type 'confirm' to create with default settings.",
        parse_mode='Markdown'
    )
    
    context.user_data['event_template'] = {
        'title': title,
        'start_time': start_time.isoformat(),
        'end_time': end_time.isoformat(),
        'type': event_type
    }
    context.user_data['awaiting_event_title'] = True


async def show_event_detail(update: Update, context: ContextTypes.DEFAULT_TYPE, event_id: str) -> None:
    """
    Show detailed view of an event
    """
    query = update.callback_query
    gql_client = get_user_client(context)
    
    event_query = """
    query GetEvent($id: UUID!) {
        event(id: $id) {
            id
            title
            description
            startTime
            endTime
            type
            allDay
            location
            attendees
        }
    }
    """
    
    try:
        result = await gql_client.execute(event_query, {'id': event_id})
        event = result.get('event')
        
        if not event:
            await query.edit_message_text("❌ Event not found.")
            return
        
        title = event['title']
        description = event.get('description', '')
        start_time = event.get('startTime', '')
        end_time = event.get('endTime', '')
        event_type = event.get('type', '')
        all_day = event.get('allDay', False)
        location = event.get('location', '')
        attendees = event.get('attendees', [])
        
        type_emoji = {
            'ACTIVITY': '✅',
            'MEETING': '👥',
            'LEARNING': '📚',
            'REMINDER': '🔔',
            'CUSTOM': '📌'
        }.get(event_type, '📌')
        
        message = f"{type_emoji} **{title}**\n\n"
        
        if all_day:
            message += "🌅 All Day Event\n\n"
        elif start_time and end_time:
            from datetime import datetime
            try:
                start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                message += f"🕐 {start_dt.strftime('%I:%M %p')} - {end_dt.strftime('%I:%M %p')}\n"
                message += f"📅 {start_dt.strftime('%A, %B %d, %Y')}\n\n"
            except:
                pass
        
        if description:
            message += f"{description}\n\n"
        
        if location:
            message += f"📍 {location}\n\n"
        
        if attendees:
            message += f"👥 Attendees: {', '.join(attendees)}\n\n"
        
        keyboard = [
            [
                InlineKeyboardButton("🗑️ Delete", callback_data=f"event:delete:{event_id}"),
                InlineKeyboardButton("« Back", callback_data="schedule:today")
            ]
        ]
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
        
    except Exception as e:
        logger.error(f"Error showing event detail: {e}", exc_info=True)
        await query.edit_message_text("❌ Error loading event.")


async def delete_event(update: Update, context: ContextTypes.DEFAULT_TYPE, event_id: str) -> None:
    """
    Delete an event
    """
    query = update.callback_query
    gql_client = get_user_client(context)
    
    mutation = """
    mutation DeleteEvent($id: UUID!) {
        deleteEvent(id: $id)
    }
    """
    
    try:
        await gql_client.execute(mutation, {'id': event_id})
        await query.edit_message_text(
            "✅ **Event Deleted**\n\n"
            "The event has been removed from your calendar.\n\n"
            "Use /schedule to view your calendar.",
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Error deleting event: {e}", exc_info=True)
        await query.edit_message_text("❌ Error deleting event.")
