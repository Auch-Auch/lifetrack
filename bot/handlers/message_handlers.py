import logging
import re
from datetime import datetime, timedelta
from telegram import Update
from telegram.ext import ContextTypes

logger = logging.getLogger(__name__)


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Handle text messages for creating notes, events, etc.
    """
    # Check if we're awaiting specific input
    user_data = context.user_data
    
    # Handle login flow FIRST (before checking for gql_client)
    if user_data.get('awaiting_email'):
        await process_email(update, context)
        return
    
    if user_data.get('awaiting_password'):
        # For password, we need the base gql_client from bot_data
        base_client = context.bot_data.get('gql_client')
        if not base_client:
            await update.message.reply_text("❌ Bot not initialized properly.")
            return
        await process_password(update, context, base_client)
        return
    
    # Now check for authenticated client for all other operations
    gql_client = context.user_data.get('gql_client')
    
    if not gql_client:
        await update.message.reply_text(
            "🔒 Please login first using /start"
        )
        return
    
    if user_data.get('awaiting_note'):
        await create_note_from_message(update, context)
        user_data['awaiting_note'] = False
        
    elif user_data.get('awaiting_note_search'):
        await search_notes(update, context)
        user_data['awaiting_note_search'] = False
        
    elif user_data.get('awaiting_event'):
        await create_event_from_message(update, context)
        user_data['awaiting_event'] = False
        
    elif user_data.get('awaiting_event_title'):
        await finalize_event_from_template(update, context)
        user_data['awaiting_event_title'] = False
        
    elif user_data.get('awaiting_reminder'):
        await create_reminder_from_message(update, context)
        user_data['awaiting_reminder'] = False
        
    # Otherwise, provide helpful response
    else:
        await update.message.reply_text(
            "💡 **Quick Commands:**\n\n"
            "• /session - Manage learning sessions\n"
            "• /schedule - View calendar & create events\n"
            "• /reminders - Manage reminders\n"
            "• /notes - View & create notes\n"
            "• /stats - Check your progress\n\n"
            "Use buttons in these commands for quick actions!"
        )


async def process_email(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Process email input during login"""
    email = update.message.text.strip()
    
    # Basic email validation
    if '@' not in email or '.' not in email:
        await update.message.reply_text(
            "❌ Invalid email format. Please send a valid email address."
        )
        return
    
    # Store email and ask for password
    context.user_data['login_email'] = email
    context.user_data['awaiting_email'] = False
    context.user_data['awaiting_password'] = True
    
    await update.message.reply_text(
        "🔐 Now send your password.\n\n"
        "⚠️ Your password will be deleted from chat immediately for security.",
        parse_mode='Markdown'
    )


async def process_password(update: Update, context: ContextTypes.DEFAULT_TYPE, gql_client) -> None:
    """Process password and attempt login"""
    password = update.message.text.strip()
    email = context.user_data.get('login_email')
    
    # Delete the password message for security
    try:
        await update.message.delete()
    except Exception:
        pass
    
    if not email:
        await update.message.reply_text("❌ Error: Email not found. Please run /start again.")
        context.user_data.clear()
        return
    
    # Attempt login
    try:
        from backend_client.simple_client import GraphQLClient
        
        # Create a new client without auth token for login
        login_client = GraphQLClient(gql_client.url, None, gql_client.timeout)
        auth_payload = await login_client.login(email, password)
        
        # Store auth info
        context.user_data['auth_token'] = auth_payload['token']
        context.user_data['user_id'] = auth_payload['user']['id']
        context.user_data['user_email'] = auth_payload['user']['email']
        context.user_data['user_name'] = auth_payload['user'].get('name', 'User')
        
        # Clean up login state
        context.user_data.pop('login_email', None)
        context.user_data.pop('awaiting_password', None)
        
        # Create authenticated client for this user
        user_client = GraphQLClient(gql_client.url, auth_payload['token'], gql_client.timeout)
        context.user_data['gql_client'] = user_client
        
        # Add user to active users for notification tracking
        telegram_id = update.effective_user.id
        active_users = context.bot_data.get('active_users', {})
        active_users[telegram_id] = {
            'gql_client': user_client,
            'user_id': auth_payload['user']['id'],
            'name': auth_payload['user'].get('name', 'User')
        }
        logger.info(f"Added user {telegram_id} to active users for notifications")
        
        # Import keyboard function
        from handlers.commands import get_main_keyboard
        
        await update.effective_chat.send_message(
            f"✅ <b>Login Successful!</b>\n\n"
            f"Welcome, {auth_payload['user'].get('name', 'User')}!\n"
            f"📧 {auth_payload['user']['email']}\n\n"
            f"You can now use all bot commands.\n\n"
            f"⚡ Use the buttons below to get started!",
            parse_mode='HTML',
            reply_markup=get_main_keyboard()
        )
        
    except Exception as e:
        logger.error(f"Login failed: {e}")
        context.user_data.clear()
        await update.effective_chat.send_message(
            f"❌ <b>Login Failed</b>\n\n"
            f"{str(e)}\n\n"
            f"Please check your credentials and try again with /start",
            parse_mode='HTML'
        )


async def create_note_from_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Create a note from user message
    """
    message_text = update.message.text
    gql_client = context.user_data.get('gql_client')
    
    # Parse the message
    lines = message_text.strip().split('\n')
    
    # Extract tags (words starting with #)
    tags = re.findall(r'#(\w+)', message_text)
    
    # Remove tags from text
    clean_text = re.sub(r'#\w+', '', message_text).strip()
    
    if len(lines) >= 2:
        # Multi-line: first line is title, rest is content
        title = lines[0].strip()
        content = '\n'.join(lines[1:]).strip()
        # Remove tags from content
        content = re.sub(r'#\w+', '', content).strip()
    else:
        # Single line: use as both title and content
        title = clean_text[:50]  # First 50 chars as title
        content = clean_text
    
    if not title or not content:
        await update.message.reply_text(
            "❌ **Invalid Note Format**\n\n"
            "Please provide at least a title and content.\n\n"
            "Example:\n"
            "`Meeting Notes\nDiscussed project timeline\n#work #meeting`",
            parse_mode='Markdown'
        )
        return
    
    mutation = """
    mutation CreateNote($input: CreateNoteInput!) {
        createNote(input: $input) {
            id
            title
            tags
        }
    }
    """
    
    try:
        result = await gql_client.execute(mutation, {
            'input': {
                'title': title,
                'content': content,
                'tags': tags
            }
        })
        
        note = result.get('createNote')
        
        if note:
            tags_str = ' '.join(f'#{tag}' for tag in tags) if tags else ''
            await update.message.reply_text(
                f"✅ **Note Created!**\n\n"
                f"📝 {note['title']}\n"
                f"{tags_str}\n\n"
                "Use /notes to view all your notes.",
                parse_mode='Markdown'
            )
        else:
            await update.message.reply_text("❌ Failed to create note.")
            
    except Exception as e:
        logger.error(f"Error creating note: {e}", exc_info=True)
        await update.message.reply_text("❌ Error creating note. Please try again.")


async def search_notes(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Search notes by keywords
    """
    query_text = update.message.text
    gql_client = context.user_data.get('gql_client')
    
    search_query = """
    query SearchNotes($query: String!) {
        searchNotes(query: $query) {
            id
            title
            content
            tags
        }
    }
    """
    
    try:
        result = await gql_client.execute(search_query, {'query': query_text})
        notes = result.get('searchNotes', [])
        
        if not notes:
            await update.message.reply_text(
                f"🔍 **No results found for:** `{query_text}`\n\n"
                "Try different keywords.",
                parse_mode='Markdown'
            )
            return
        
        message = f"🔍 **Search Results** ({len(notes)} found)\n\n"
        
        for i, note in enumerate(notes[:5], 1):
            title = note['title']
            tags = note.get('tags', [])
            tags_str = ' '.join(f'#{tag}' for tag in tags[:2]) if tags else ''
            
            message += f"{i}. **{title}**"
            if tags_str:
                message += f" {tags_str}"
            message += "\n"
        
        if len(notes) > 5:
            message += f"\n_...and {len(notes) - 5} more._\n"
        
        message += "\nUse /notes to manage your notes."
        
        await update.message.reply_text(message, parse_mode='Markdown')
        
    except Exception as e:
        logger.error(f"Error searching notes: {e}", exc_info=True)
        await update.message.reply_text("❌ Error searching notes.")


async def create_event_from_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Create an event from user message
    """
    message_text = update.message.text
    gql_client = context.user_data.get('gql_client')
    
    lines = message_text.strip().split('\n')
    
    if len(lines) < 3:
        await update.message.reply_text(
            "❌ **Invalid Event Format**\n\n"
            "Please provide:\n"
            "1. Title\n"
            "2. Date & Time (YYYY-MM-DD HH:MM)\n"
            "3. Duration (minutes)\n"
            "4. Type (optional: LEARNING/MEETING/REMINDER/CUSTOM)\n\n"
            "Example:\n"
            "`Team Meeting\n2026-02-13 14:00\n60\nMEETING`",
            parse_mode='Markdown'
        )
        return
    
    title = lines[0].strip()
    date_time_str = lines[1].strip()
    duration_str = lines[2].strip()
    event_type = lines[3].strip().upper() if len(lines) > 3 else 'CUSTOM'
    
    # Validate event type
    valid_types = ['ACTIVITY', 'LEARNING', 'MEETING', 'REMINDER', 'CUSTOM']
    if event_type not in valid_types:
        event_type = 'CUSTOM'
    
    # Parse date and time
    try:
        # Try different date formats
        for fmt in ['%Y-%m-%d %H:%M', '%Y-%m-%d %H:%M:%S', '%m/%d/%Y %H:%M']:
            try:
                start_time = datetime.strptime(date_time_str, fmt)
                break
            except ValueError:
                continue
        else:
            raise ValueError("Invalid date format")
        
        # Parse duration
        duration = int(duration_str)
        end_time = start_time + timedelta(minutes=duration)
        
    except Exception as e:
        logger.error(f"Error parsing event data: {e}")
        await update.message.reply_text(
            "❌ **Invalid Date/Time or Duration**\n\n"
            "Use format: YYYY-MM-DD HH:MM\n"
            "Duration in minutes (e.g., 60)\n\n"
            "Example: `2026-02-13 14:00` and `60`",
            parse_mode='Markdown'
        )
        return
    
    mutation = """
    mutation CreateEvent($input: CreateEventInput!) {
        createEvent(input: $input) {
            id
            title
            startTime
            type
        }
    }
    """
    
    try:
        result = await gql_client.execute(mutation, {
            'input': {
                'title': title,
                'type': event_type,
                'startTime': start_time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'endTime': end_time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'allDay': False
            }
        })
        
        event = result.get('createEvent')
        
        if event:
            type_emoji = {
                'ACTIVITY': '✅',
                'MEETING': '👥',
                'LEARNING': '📚',
                'REMINDER': '🔔',
                'CUSTOM': '📌'
            }.get(event_type, '📌')
            
            await update.message.reply_text(
                f"✅ **Event Created!**\n\n"
                f"{type_emoji} {event['title']}\n"
                f"📅 {start_time.strftime('%A, %B %d at %I:%M %p')}\n"
                f"⏱️ Duration: {duration} minutes\n\n"
                "Use /schedule to view your calendar.",
                parse_mode='Markdown'
            )
        else:
            await update.message.reply_text("❌ Failed to create event.")
            
    except Exception as e:
        logger.error(f"Error creating event: {e}", exc_info=True)
        await update.message.reply_text("❌ Error creating event. Please try again.")


async def finalize_event_from_template(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Finalize event creation from template with custom title
    """
    message_text = update.message.text.strip()
    gql_client = context.user_data.get('gql_client')
    
    template = context.user_data.get('event_template', {})
    
    if not template:
        await update.message.reply_text("❌ Template expired. Please start again.")
        return
    
    # Use custom title or confirm with default
    if message_text.lower() != 'confirm':
        template['title'] = message_text
    
    mutation = """
    mutation CreateEvent($input: CreateEventInput!) {
        createEvent(input: $input) {
            id
            title
            startTime
            type
        }
    }
    """
    
    try:
        result = await gql_client.execute(mutation, {
            'input': {
                'title': template['title'],
                'type': template['type'],
                'startTime': template['start_time'],
                'endTime': template['end_time'],
                'allDay': False
            }
        })
        
        event = result.get('createEvent')
        
        if event:
            type_emoji = {
                'ACTIVITY': '✅',
                'MEETING': '👥',
                'LEARNING': '📚',
                'REMINDER': '🔔',
                'CUSTOM': '📌'
            }.get(template['type'], '📌')
            
            start_dt = datetime.fromisoformat(template['start_time'])
            
            await update.message.reply_text(
                f"✅ **Event Created!**\n\n"
                f"{type_emoji} {event['title']}\n"
                f"📅 {start_dt.strftime('%A, %B %d at %I:%M %p')}\n\n"
                "Use /schedule to view your calendar.",
                parse_mode='Markdown'
            )
        else:
            await update.message.reply_text("❌ Failed to create event.")
            
        # Clear template
        context.user_data.pop('event_template', None)
        
    except Exception as e:
        logger.error(f"Error finalizing event: {e}", exc_info=True)
        await update.message.reply_text("❌ Error creating event. Please try again.")

async def create_reminder_from_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Create a reminder from user message
    Expected format:
    Title
    Description (optional)
    Due: 2026-02-20 14:30
    Priority: HIGH (optional: LOW, MEDIUM, HIGH)
    """
    message_text = update.message.text.strip()
    gql_client = context.user_data.get('gql_client')
    
    try:
        import re
        from datetime import datetime
        from zoneinfo import ZoneInfo
        
        # Get user's timezone or default to UTC
        # TODO: Store user timezone preference in user_data
        user_timezone = context.user_data.get('timezone', 'UTC')
        
        lines = message_text.split('\n')
        
        # Parse components
        title = lines[0].strip() if lines else "Reminder"
        description = None
        due_time = None
        priority = "MEDIUM"  # Default priority
        
        # Parse remaining lines for metadata
        description_lines = []
        for line in lines[1:]:
            line = line.strip()
            
            # Check for Due time
            due_match = re.match(r'Due:\s*(.+)', line, re.IGNORECASE)
            if due_match:
                due_str = due_match.group(1).strip()
                try:
                    # Try parsing various date formats
                    for fmt in ['%Y-%m-%d %H:%M', '%Y-%m-%d %H:%M:%S', '%m/%d/%Y %H:%M', '%m/%d %H:%M']:
                        try:
                            due_time = datetime.strptime(due_str, fmt)
                            # Localize to user's timezone (assume input is in their local time)
                            try:
                                tz = ZoneInfo(user_timezone)
                                due_time = due_time.replace(tzinfo=tz)
                            except Exception:
                                # Fallback: treat as naive datetime, backend will handle
                                pass
                            break
                        except ValueError:
                            continue
                    
                    if not due_time:
                        # Try ISO format
                        due_time = datetime.fromisoformat(due_str.replace('Z', '+00:00'))
                except Exception:
                    pass
                continue
            
            # Check for priority
            priority_match = re.match(r'Priority:\s*(\w+)', line, re.IGNORECASE)
            if priority_match:
                priority_value = priority_match.group(1).upper()
                if priority_value in ['LOW', 'MEDIUM', 'HIGH']:
                    priority = priority_value
                continue
            
            # Otherwise it's part of description
            if line:
                description_lines.append(line)
        
        if description_lines:
            description = '\n'.join(description_lines)
        
        if not due_time:
            await update.message.reply_text(
                "❌ **Invalid Format**\n\n"
                "Please include a due date/time:\n"
                "`Due: 2026-02-20 14:30`",
                parse_mode='Markdown'
            )
            return
        
        # Create reminder
        mutation = """
        mutation CreateReminder($input: CreateReminderInput!) {
            createReminder(input: $input) {
                id
                title
                dueTime
                priority
            }
        }
        """
        
        result = await gql_client.execute(mutation, {
            'input': {
                'title': title,
                'description': description,
                'dueTime': due_time.isoformat() if due_time.tzinfo else due_time.strftime('%Y-%m-%dT%H:%M:%S') + 'Z',
                'priority': priority,
                'repeatPattern': 'NONE',
                'notificationChannels': ['telegram'],
                'reminderTimes': [0]  # Notify at due time
            }
        })
        
        reminder = result.get('createReminder')
        
        if reminder:
            priority_emoji = {'LOW': '🔵', 'MEDIUM': '🟡', 'HIGH': '🔴'}.get(priority, '⚪')
            
            await update.message.reply_text(
                f"✅ **Reminder Created!**\n\n"
                f"{priority_emoji} {reminder['title']}\n"
                f"📅 Due: {due_time.strftime('%A, %B %d at %I:%M %p')}\n\n"
                "You'll receive a notification when it's due.\n\n"
                "Use /reminders to view all your reminders.",
                parse_mode='Markdown'
            )
        else:
            await update.message.reply_text("❌ Failed to create reminder.")
    
    except Exception as e:
        logger.error(f"Error creating reminder: {e}", exc_info=True)
        error_msg = str(e)
        await update.message.reply_text(
            f"❌ **Error Creating Reminder**\n\n"
            f"Error: {error_msg}\n\n"
            "Please use this format:\n"
            "`Title\n"
            "Description (optional)\n"
            "Due: 2026-02-20 14:30\n"
            "Priority: HIGH`",
            parse_mode='Markdown'
        )
