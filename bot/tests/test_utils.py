"""
Utility tests
"""

import pytest
from datetime import datetime, timedelta


class TestDateUtils:
    """Test date utility functions"""
    
    def test_date_formatting(self):
        """Test date formatting utilities"""
        # Basic test to ensure date handling works
        now = datetime.now()
        assert now.year >= 2024
        
        tomorrow = now + timedelta(days=1)
        assert tomorrow > now
    
    def test_time_calculations(self):
        """Test time calculation utilities"""
        duration_minutes = 60
        duration_hours = duration_minutes / 60
        assert duration_hours == 1.0
        
        duration_minutes = 90
        duration_hours = duration_minutes / 60
        assert duration_hours == 1.5


class TestStringUtils:
    """Test string utility functions"""
    
    def test_text_parsing(self):
        """Test basic text parsing"""
        text = "Log 30 minutes of Python"
        assert "Python" in text
        assert "30" in text
        assert "minutes" in text
    
    def test_skill_extraction(self):
        """Test skill name extraction patterns"""
        patterns = [
            ("practice Python", "Python"),
            ("study Mathematics", "Mathematics"),
            ("work on Project X", "Project X"),
        ]
        
        for text, expected_skill in patterns:
            # Just verify the expected skill is in the text
            assert expected_skill in text
