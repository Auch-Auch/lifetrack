import os
from pathlib import Path


class Config:
    """Bot configuration from environment variables"""
    
    # Telegram
    TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
    
    # Backend API
    BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8080/query')
    SERVICE_JWT = os.getenv('SERVICE_JWT')
    
    # LLM Model (Qwen 2.5 Coder 7B optimized)
    MODEL_PATH = os.getenv('MODEL_PATH', '/app/models/qwen2.5-coder-7b-instruct-q5_k_m.gguf')
    MODEL_N_CTX = int(os.getenv('MODEL_N_CTX', '8192'))  # Qwen supports 32K, using 8K for balance
    MODEL_N_THREADS = int(os.getenv('MODEL_N_THREADS', '8'))
    MODEL_N_GPU_LAYERS = int(os.getenv('MODEL_N_GPU_LAYERS', '0'))  # GPU offloading if available
    MODEL_TEMPERATURE = float(os.getenv('MODEL_TEMPERATURE', '0.1'))  # Low for structured output
    MODEL_TEMPERATURE_CREATIVE = float(os.getenv('MODEL_TEMPERATURE_CREATIVE', '0.6'))  # For explanations
    MODEL_MAX_TOKENS_QUERY = int(os.getenv('MODEL_MAX_TOKENS_QUERY', '384'))  # GraphQL generation
    MODEL_MAX_TOKENS_ERROR = int(os.getenv('MODEL_MAX_TOKENS_ERROR', '96'))  # Error explanations
    
    # Paths
    BASE_DIR = Path(__file__).parent
    SCHEMAS_DIR = BASE_DIR / 'schemas'
    RESPONSE_TEMPLATES_PATH = SCHEMAS_DIR / 'response_templates_jinja.yaml'
    GRAPHQL_SCHEMA_PATH = '/backend/graph/schema.graphqls'
    GRAPHQL_EXAMPLES_PATH = SCHEMAS_DIR / 'graphql_examples.yaml'
    RAG_INDEX_PATH = BASE_DIR / 'data' / 'graphql_rag.index'
    
    # Bot Settings
    MAX_MESSAGE_LENGTH = 4096  # Telegram limit
    DEFAULT_RESPONSE_TIMEOUT = 30  # seconds
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        if not cls.TELEGRAM_BOT_TOKEN:
            raise ValueError("TELEGRAM_BOT_TOKEN is required")
        if not cls.SERVICE_JWT:
            raise ValueError("SERVICE_JWT is required")
        if not os.path.exists(cls.MODEL_PATH):
            raise ValueError(f"Model not found at {cls.MODEL_PATH}")
