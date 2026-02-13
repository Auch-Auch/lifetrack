"""
Template helpers and filters for Jinja2 response formatting
"""
from datetime import datetime, timezone
from typing import Any, Dict, List


def format_duration(minutes: int) -> str:
    """Format duration in minutes to human-readable string"""
    if minutes < 60:
        return f"{minutes}m"
    
    hours = minutes / 60
    if hours < 24:
        return f"{hours:.1f}h"
    
    days = hours / 24
    return f"{days:.1f}d"


def format_time(iso_time: str) -> str:
    """Format ISO timestamp to readable time"""
    try:
        dt = datetime.fromisoformat(iso_time.replace('Z', '+00:00'))
        return dt.strftime('%I:%M %p')
    except (ValueError, AttributeError):
        return iso_time


def format_date(iso_date: str) -> str:
    """Format ISO date to readable format"""
    try:
        dt = datetime.fromisoformat(iso_date.replace('Z', '+00:00'))
        today = datetime.now(timezone.utc).date()
        date = dt.date()
        
        if date == today:
            return "Today"
        elif (today - date).days == 1:
            return "Yesterday"
        elif (date - today).days == 1:
            return "Tomorrow"
        else:
            return dt.strftime('%B %d, %Y')
    except (ValueError, AttributeError):
        return iso_date


def format_datetime(iso_datetime: str) -> str:
    """Format ISO datetime to readable format"""
    try:
        dt = datetime.fromisoformat(iso_datetime.replace('Z', '+00:00'))
        return dt.strftime('%B %d at %I:%M %p')
    except (ValueError, AttributeError):
        return iso_datetime


def pluralize(count: int, singular: str, plural: str = None) -> str:
    """Return singular or plural form based on count"""
    if plural is None:
        plural = singular + 's'
    return singular if count == 1 else plural


def truncate(text: str, length: int = 50, suffix: str = "...") -> str:
    """Truncate text to specified length"""
    if not text or len(text) <= length:
        return text
    return text[:length].rstrip() + suffix


def event_icon(event_type: str) -> str:
    """Get icon for event type"""
    icons = {
        'LEARNING': '📚',
        'ACTIVITY': '⚡',
        'MEETING': '👥',
        'REMINDER': '⏰',
        'CUSTOM': '📅',
    }
    return icons.get(event_type.upper(), '📅')


def skill_level_emoji(level: str) -> str:
    """Get emoji for skill level"""
    level_map = {
        'beginner': '🌱',
        'intermediate': '🌿',
        'advanced': '🌳',
        'expert': '🏆',
    }
    return level_map.get(level.lower(), '')


def extract_data(graphql_result: Dict[str, Any]) -> Any:
    """Extract actual data from GraphQL result, skipping __typename"""
    if not isinstance(graphql_result, dict):
        return graphql_result
    
    # Find the first key that's not __typename
    for key, value in graphql_result.items():
        if key != '__typename':
            return value
    
    return graphql_result


def is_list(data: Any) -> bool:
    """Check if data is a list"""
    return isinstance(data, list)


def is_empty(data: Any) -> bool:
    """Check if data is empty"""
    if data is None:
        return True
    if isinstance(data, (list, dict, str)):
        return len(data) == 0
    return False


def summarize_list(items: List[Any], max_items: int = 5) -> tuple:
    """Return truncated list and count of remaining items"""
    if len(items) <= max_items:
        return items, 0
    return items[:max_items], len(items) - max_items


# Dictionary of all helper functions for easy registration
TEMPLATE_FILTERS = {
    'format_duration': format_duration,
    'format_time': format_time,
    'format_date': format_date,
    'format_datetime': format_datetime,
    'pluralize': pluralize,
    'truncate': truncate,
    'event_icon': event_icon,
    'skill_level_emoji': skill_level_emoji,
    'extract_data': extract_data,
    'is_list': is_list,
    'is_empty': is_empty,
}

TEMPLATE_GLOBALS = {
    'summarize_list': summarize_list,
}
