import logging
from llama_cpp import Llama
from config import Config

logger = logging.getLogger(__name__)


def load_model(model_path: str) -> Llama:
    """Load llama.cpp model with optimized settings for Qwen 2.5 Coder"""
    try:
        logger.info(f"Loading model from {model_path}")
        logger.info(f"Config: n_ctx={Config.MODEL_N_CTX}, n_threads={Config.MODEL_N_THREADS}, n_gpu_layers={Config.MODEL_N_GPU_LAYERS}")
        
        model = Llama(
            model_path=model_path,
            n_ctx=Config.MODEL_N_CTX,
            n_threads=Config.MODEL_N_THREADS,
            n_gpu_layers=Config.MODEL_N_GPU_LAYERS,
            n_batch=512,  # Larger batch for Qwen
            use_mmap=True,  # Memory-map model file
            use_mlock=False,  # Better for containers
            verbose=False,  # Disable verbose for cleaner logs
        )
        logger.info("Qwen 2.5 Coder model loaded successfully")
        return model
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise
