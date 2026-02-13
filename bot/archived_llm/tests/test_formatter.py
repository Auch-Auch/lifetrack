"""
Test script for new Jinja2-based response formatter
"""
import sys
sys.path.insert(0, '/app')

from llm.response_formatter_new import ResponseFormatter
from datetime import datetime, timezone


def test_skills_list():
    """Test skills list template"""
    print("\\n=== Testing Skills List ===")
    
    formatter = ResponseFormatter()
    
    # Test with skills
    data = {
        'skills': [
            {'name': 'Python', 'level': 'intermediate', 'notes': 'Learning async programming'},
            {'name': 'Guitar', 'level': 'beginner', 'notes': None},
            {'name': 'Spanish', 'level': None, 'notes': 'Working on vocabulary'},
        ]
    }
    
    intent = {'function': 'list_skills', 'parameters': {}}
    response = formatter.format_response(intent, data)
    print(response)
    
    # Test with empty skills
    print("\\n--- Empty skills ---")
    empty_data = {'skills': []}
    response = formatter.format_response(intent, empty_data)
    print(response)


def test_stats():
    """Test stats template"""
    print("\\n=== Testing Stats ===")
    
    formatter = ResponseFormatter()
    
    data = {
        'activityStats': {
            'totalActivities': 15,
            'totalMinutes': 450,
            'totalHours': 7.5,
            'skillBreakdown': [
                {'skillName': 'Python', 'activityCount': 8, 'totalHours': 4.5},
                {'skillName': 'Guitar', 'activityCount': 5, 'totalHours': 2.5},
                {'skillName': 'Spanish', 'activityCount': 2, 'totalHours': 0.5},
            ]
        }
    }
    
    intent = {'function': 'get_stats', 'parameters': {'period': 'week'}}
    response = formatter.format_response(intent, data)
    print(response)


def test_schedule():
    """Test schedule template"""
    print("\\n=== Testing Schedule ===")
    
    formatter = ResponseFormatter()
    
    now = datetime.now(timezone.utc)
    data = {
        'events': [
            {
                'title': 'Python Learning Session',
                'type': 'LEARNING',
                'startTime': now.isoformat(),
                'description': 'Work on async/await patterns'
            },
            {
                'title': 'Team Meeting',
                'type': 'MEETING',
                'startTime': now.isoformat(),
                'description': None
            }
        ]
    }
    
    intent = {'function': 'query_schedule', 'parameters': {'date': 'today'}}
    response = formatter.format_response(intent, data)
    print(response)


def test_session_start():
    """Test session start template"""
    print("\\n=== Testing Session Start ===")
    
    formatter = ResponseFormatter()
    
    # New skill created
    data = {
        'name': 'Learning session',
        'skill_name': 'Rust',
        'skill_was_created': True,
        'status': 'ACTIVE'
    }
    
    intent = {'function': 'start_session', 'parameters': {}}
    response = formatter.format_response(intent, data)
    print(response)
    
    # Existing skill
    print("\\n--- Existing skill ---")
    data['skill_was_created'] = False
    data['skill_name'] = 'Python'
    response = formatter.format_response(intent, data)
    print(response)


def test_error_formatting():
    """Test error formatting"""
    print("\\n=== Testing Error Formatting ===")
    
    formatter = ResponseFormatter()  # Without LLM for quick test
    
    # Test various error types
    errors = [
        (ValueError("skill not found"), "start learning session for Rust"),
        (Exception("you already have an active session"), "start python session"),
        (PermissionError("unauthorized access"), "delete all activities"),
    ]
    
    for error, user_msg in errors:
        response = formatter.format_error(error, user_msg)
        print(f"\\n{user_msg}\\n  -> {response}")


def test_notes_list():
    """Test notes list template"""
    print("\\n=== Testing Notes List ===")
    
    formatter = ResponseFormatter()
    
    data = {
        'notes': {
            'nodes': [
                {'title': 'Python tips', 'content': 'Use list comprehensions for filtering', 'tags': ['python', 'tips']},
                {'title': 'Guitar practice', 'content': 'Worked on C major scale', 'tags': ['music']},
                {'title': 'Spanish vocab', 'content': 'New words: hola, gracias, por favor', 'tags': ['spanish', 'vocabulary']},
            ],
            'totalCount': 3
        }
    }
    
    intent = {'function': 'list_notes', 'parameters': {}}
    response = formatter.format_response(intent, data)
    print(response)


if __name__ == '__main__':
    print("Testing Jinja2 Response Formatter\\n" + "="*50)
    
    try:
        test_skills_list()
        test_stats()
        test_schedule()
        test_session_start()
        test_notes_list()
        test_error_formatting()
        
        print("\\n" + "="*50)
        print("✅ All tests completed!")
        
    except Exception as e:
        print(f"\\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
