import os
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes

from handlers import commands, ui_commands, callbacks, message_handlers
from backend_client.simple_client import GraphQLClient
from config import Config

# LLM logic archived - see archived_llm/ directory
# from llm.model_loader import load_model
# from llm.rag_store import GraphQLRAGStore

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)


async def post_init(application: Application) -> None:
    """Initialize resources after bot starts"""
    # LLM components archived - using command-based UI only
    # To re-enable LLM: uncomment imports and code in archived_llm/
    
    # Load LLM model (archived)
    # logger.info("Loading LLM model...")
    # model = load_model(Config.MODEL_PATH)
    # application.bot_data['llm_model'] = model
    
    # Initialize RAG store for GraphQL query generation (archived)
    # logger.info("Initializing RAG vector store...")
    # rag_store = GraphQLRAGStore(
    #     schema_path=str(Config.GRAPHQL_SCHEMA_PATH),
    #     examples_path=str(Config.GRAPHQL_EXAMPLES_PATH),
    #     index_path=str(Config.RAG_INDEX_PATH)
    # )
    # application.bot_data['rag_store'] = rag_store
    
    # Initialize GraphQL client
    logger.info("Initializing GraphQL client...")
    gql_client = GraphQLClient(Config.BACKEND_URL, Config.SERVICE_JWT)
    application.bot_data['gql_client'] = gql_client
    
    logger.info("Bot initialization complete (command-based UI mode)")


def main() -> None:
    """Start the bot"""
    # Validate config
    if not Config.TELEGRAM_BOT_TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN environment variable is required")
    
    # Create application
    application = Application.builder() \
        .token(Config.TELEGRAM_BOT_TOKEN) \
        .post_init(post_init) \
        .build()
    
    # Register command handlers
    application.add_handler(CommandHandler("start", commands.start))
    application.add_handler(CommandHandler("help", commands.help_command))
    
    # UI-based commands (new command-first approach)
    application.add_handler(CommandHandler("session", ui_commands.session))
    application.add_handler(CommandHandler("skills", ui_commands.skills))
    application.add_handler(CommandHandler("schedule", ui_commands.schedule))
    application.add_handler(CommandHandler("notes", ui_commands.notes_command))
    application.add_handler(CommandHandler("stats", ui_commands.stats_command))
    
    # Register callback query handler for inline buttons
    application.add_handler(CallbackQueryHandler(callbacks.handle_callback))
    
    # Register message handler for note/event creation
    application.add_handler(MessageHandler(
        filters.TEXT & ~filters.COMMAND,
        message_handlers.handle_message
    ))
    
    # Natural language message handler (archived)
    # To re-enable: uncomment archived_llm/handlers/message.py
    # application.add_handler(MessageHandler(
    #     filters.TEXT & ~filters.COMMAND,
    #     message.handle_message
    # ))
    
    # Start bot
    logger.info("Starting bot...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
