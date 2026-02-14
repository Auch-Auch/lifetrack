"""
Notification handler for sending event reminders and alerts to users
"""

import logging
import asyncio
from datetime import datetime
from telegram import Bot
from telegram.error import TelegramError

logger = logging.getLogger(__name__)


async def check_and_send_notifications(bot: Bot, active_users: dict) -> None:
    """
    Check for pending notifications for each logged-in user and send via Telegram
    Runs periodically in the background
    
    Args:
        bot: Telegram Bot instance
        active_users: Dict mapping telegram_id to user session data
                     {telegram_id: {'gql_client': client, 'user_id': uuid, 'name': str}}
    """
    if not active_users:
        return
    
    try:
        # Check notifications for each active user
        for telegram_id, user_data in list(active_users.items()):
            try:
                gql_client = user_data.get('gql_client')
                if not gql_client:
                    continue
                
                # Query for this user's pending notifications
                query = """
                query GetPendingNotifications {
                    pendingNotifications {
                        id
                        userId
                        eventId
                        reminderId
                        scheduledTime
                        channel
                        notificationType
                        message
                    }
                }
                """
                
                result = await gql_client.execute(query)
                notifications = result.get('pendingNotifications', [])
                
                if not notifications:
                    continue
                
                logger.info(f"Found {len(notifications)} pending notifications for user {telegram_id}")
                
                # Process each notification for this user
                for notif in notifications:
                    # Only send telegram notifications
                    if notif['channel'] != 'telegram':
                        continue
                    
                    # Format message based on notification type
                    message = await format_notification_message(notif, gql_client)
                    
                    # Send notification to this user
                    try:
                        await bot.send_message(
                            chat_id=telegram_id,
                            text=message,
                            parse_mode='HTML'
                        )
                        
                        # Mark notification as sent
                        mark_sent_mutation = """
                        mutation MarkNotificationSent($id: UUID!) {
                            markNotificationSent(id: $id) {
                                id
                                sent
                            }
                        }
                        """
                        await gql_client.execute(mark_sent_mutation, {'id': notif['id']})
                        
                        logger.info(f"Sent notification {notif['id']} to user {telegram_id}")
                        
                    except TelegramError as e:
                        logger.error(f"Failed to send notification to {telegram_id}: {e}")
                    
                    # Small delay to avoid rate limiting
                    await asyncio.sleep(0.1)
                    
            except Exception as e:
                logger.error(f"Error checking notifications for user {telegram_id}: {e}")
            
    except Exception as e:
        logger.error(f"Error in notification check loop: {e}", exc_info=True)


async def format_notification_message(notif: dict, gql_client) -> str:
    """
    Format notification message based on type
    """
    notif_type = notif['notificationType']
    message = notif.get('message', '')
    
    if notif_type == 'event':
        # Get event details
        if notif.get('eventId'):
            event_query = """
            query GetEvent($id: UUID!) {
                event(id: $id) {
                    title
                    startTime
                    endTime
                    type
                    location
                }
            }
            """
            result = await gql_client.execute(event_query, {'id': notif['eventId']})
            event = result.get('event')
            
            if event:
                start_time = datetime.fromisoformat(event['startTime'].replace('Z', '+00:00'))
                
                type_emoji = {
                    'ACTIVITY': '✅',
                    'MEETING': '👥',
                    'LEARNING': '📚',
                    'REMINDER': '🔔',
                    'CUSTOM': '📌'
                }.get(event['type'], '📌')
                
                message = f"🔔 <b>Event Reminder</b>\n\n"
                message += f"{type_emoji} <b>{event['title']}</b>\n"
                message += f"📅 {start_time.strftime('%A, %B %d')}\n"
                message += f"🕐 {start_time.strftime('%I:%M %p')}\n"
                
                if event.get('location'):
                    message += f"📍 {event['location']}\n"
                
                message += f"\n💡 Use /schedule to view your calendar"
    
    elif notif_type == 'reminder':
        # Get reminder details
        if notif.get('reminderId'):
            reminder_query = """
            query GetReminder($id: UUID!) {
                reminder(id: $id) {
                    title
                    description
                    dueTime
                    priority
                }
            }
            """
            result = await gql_client.execute(reminder_query, {'id': notif['reminderId']})
            reminder = result.get('reminder')
            
            if reminder:
                due_time = datetime.fromisoformat(reminder['dueTime'].replace('Z', '+00:00'))
                
                priority_emoji = {
                    'LOW': '🔵',
                    'MEDIUM': '🟡',
                    'HIGH': '🔴'
                }.get(reminder['priority'].upper(), '⚪')
                
                message = f"⏰ <b>Reminder</b>\n\n"
                message += f"{priority_emoji} <b>{reminder['title']}</b>\n"
                
                if reminder.get('description'):
                    message += f"📝 {reminder['description']}\n"
                
                message += f"📅 Due: {due_time.strftime('%A, %B %d at %I:%M %p')}\n"
                message += f"\n💡 Use /schedule to manage reminders"
    
    else:
        # Generic notification
        message = f"🔔 <b>Notification</b>\n\n{message}"
    
    return message


async def start_notification_loop(bot: Bot, active_users: dict, interval: int = 60) -> None:
    """
    Start the notification checking loop for all active users
    
    Args:
        bot: Telegram Bot instance
        active_users: Dict mapping telegram_id to user session data
        interval: Check interval in seconds (default: 60)
    """
    logger.info(f"Starting notification loop (checking every {interval}s)")
    
    while True:
        try:
            await check_and_send_notifications(bot, active_users)
        except Exception as e:
            logger.error(f"Error in notification loop: {e}", exc_info=True)
        
        await asyncio.sleep(interval)
