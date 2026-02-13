"""
Message handlers for text-based interactions (note and event creation)
"""

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
    gql_client = context.bot_data.get('gql_client')
    
    if not gql_client:
        return
    
    # Check if we're awaiting specific input
    user_data = context.user_data
    
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
        
    # Otherwise, provide helpful response
    else:
        await update.message.reply_text(
            "💡 **Quick Commands:**\n\n"
            "• /session - Manage learning sessions\n"
            "• /schedule - View calendar & create events\n"
            "• /notes - View & create notes\n"
            "• /stats - Check your progress\n\n"
            "Use buttons in these commands for quick actions!"
        )


async def create_note_from_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Create a note from user message
    """
    message_text = update.message.text
    gql_client = context.bot_data.get('gql_client')
    
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
    gql_client = context.bot_data.get('gql_client')
    
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
    gql_client = context.bot_data.get('gql_client')
    
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
    gql_client = context.bot_data.get('gql_client')
    
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
        context.user_data.pop('event_template', None)
