"""
Tests for command handlers
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from telegram import Update, User as TelegramUser, Message, Chat
from telegram.ext import ContextTypes


@pytest.fixture
def mock_update():
    """Create a mock Telegram Update"""
    update = MagicMock(spec=Update)
    update.effective_user = MagicMock(spec=TelegramUser)
    update.effective_user.id = 123456
    update.effective_user.first_name = "Test"
    update.effective_user.username = "testuser"
    update.effective_user.mention_html = MagicMock(return_value="<a href='tg://user?id=123456'>Test</a>")
    update.message = MagicMock(spec=Message)
    update.message.text = "/start"
    update.message.reply_text = AsyncMock()
    update.message.reply_html = AsyncMock()
    update.message.chat = MagicMock(spec=Chat)
    update.message.chat.id = 123456
    return update


@pytest.fixture
def mock_context():
    """Create a mock context"""
    context = MagicMock(spec=ContextTypes.DEFAULT_TYPE)
    context.user_data = {}
    context.bot = MagicMock()
    context.bot.send_message = AsyncMock()
    return context


class TestStartCommand:
    """Test /start command"""
    
    @pytest.mark.asyncio
    async def test_start_command_new_user(self, mock_update, mock_context):
        """Test /start command for new user"""
        from handlers.commands import start
        
        # Set up mock for reply_html
        mock_update.message.reply_html = AsyncMock()
        
        await start(mock_update, mock_context)
        
        # Verify reply was sent
        assert mock_update.message.reply_html.called
        call_args = str(mock_update.message.reply_html.call_args)
        assert "Welcome" in call_args or "Hi" in call_args


class TestHelpCommand:
    """Test /help command"""
    
    @pytest.mark.asyncio
    async def test_help_command(self, mock_update, mock_context):
        """Test /help command shows available commands"""
        from handlers.commands import help_command
        
        await help_command(mock_update, mock_context)
        
        # Verify help text was sent
        assert mock_update.message.reply_text.called
        call_args = str(mock_update.message.reply_text.call_args)
        # Check that some common commands are mentioned
        assert any(cmd in call_args for cmd in ['/start', '/help', 'command'])


class TestLogoutCommand:
    """Test /logout command"""
    
    @pytest.mark.asyncio
    async def test_logout_authenticated_user(self, mock_update, mock_context):
        """Test /logout command for authenticated user"""
        mock_context.user_data['auth_token'] = 'test-token'
        mock_context.user_data['user_email'] = 'test@example.com'
        
        from handlers.commands import logout
        
        # Set up mock for reply_html
        mock_update.message.reply_html = AsyncMock()
        
        await logout(mock_update, mock_context)
        
        # Verify user data was cleared
        assert 'auth_token' not in mock_context.user_data
        # Verify reply was sent
        assert mock_update.message.reply_html.called
    
    @pytest.mark.asyncio
    async def test_logout_not_authenticated(self, mock_update, mock_context):
        """Test /logout command for non-authenticated user"""
        # No auth_token in user_data
        
        from handlers.commands import logout
        
        # Set up mock for reply_text
        mock_update.message.reply_text = AsyncMock()
        
        await logout(mock_update, mock_context)
        
        # Verify message was sent
        assert mock_update.message.reply_text.called
