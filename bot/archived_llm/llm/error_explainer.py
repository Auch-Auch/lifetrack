"""  LLM-based error explainer for user-friendly error messages
Optimized for Qwen 2.5 Coder model
"""
import logging
from typing import Dict, Any, Optional
from llama_cpp import Llama
from config import Config

logger = logging.getLogger(__name__)


class ErrorExplainer:
    """Uses LLM to explain errors in natural, user-friendly language"""
    
    def __init__(self, llm_model: Llama):
        self.llm = llm_model
    
    def explain_error(
        self, 
        error: Exception, 
        user_message: str,
        graphql_query: Optional[str] = None
    ) -> str:
        """
        Generate a user-friendly explanation of an error
        
        Args:
            error: The exception that occurred
            user_message: The original user message
            graphql_query: The GraphQL query that failed (if available)
        
        Returns:
            User-friendly error explanation
        """
        error_type = type(error).__name__
        error_message = str(error)
        
        # Build context for LLM
        context = self._build_error_context(
            error_type, 
            error_message, 
            user_message,
            graphql_query
        )
        
        try:
            explanation = self._generate_explanation(context)
            return f"❌ {explanation}"
        except Exception as llm_error:
            logger.error(f"LLM error explanation failed: {llm_error}")
            # Fallback to simple error message
            return self._fallback_error_message(error_type, error_message)
    
    def _build_error_context(
        self,
        error_type: str,
        error_message: str,
        user_message: str,
        graphql_query: Optional[str]
    ) -> str:
        """Build prompt for Qwen 2.5 Coder"""
        context = f"""<|im_start|>system
Explain errors in a friendly way (max 2 sentences).<|im_end|>
<|im_start|>user
User asked: "{user_message}"
Error: {error_message}

Explain and suggest action:<|im_end|>
<|im_start|>assistant
"""
        return context
    
    def _generate_explanation(self, context: str) -> str:
        """Generate explanation with Qwen-optimized parameters"""
        response = self.llm(
            context,
            max_tokens=Config.MODEL_MAX_TOKENS_ERROR,
            temperature=Config.MODEL_TEMPERATURE_CREATIVE,
            stop=["<|im_end|>", "<|im_start|>"],
            echo=False,
            top_p=0.9,
        )
        
        explanation = response['choices'][0]['text'].strip()
        
        # Clean up the explanation
        explanation = explanation.replace('"', '').strip()
        
        # Ensure it's not too long
        if len(explanation) > 200:
            explanation = explanation[:197] + "..."
        
        return explanation
    
    def _fallback_error_message(self, error_type: str, error_message: str) -> str:
        """Simple fallback error messages when LLM fails"""
        
        # Common error patterns
        if "not found" in error_message.lower():
            return "❌ I couldn't find what you're looking for. Please check and try again."
        
        if "already" in error_message.lower() and "active" in error_message.lower():
            return "❌ You already have an active session running. Stop it before starting a new one."
        
        if "failed to fetch" in error_message.lower():
            return "❌ I had trouble getting your data. Please try again in a moment."
        
        if "invalid" in error_message.lower():
            return "❌ Something about your request wasn't quite right. Could you rephrase it?"
        
        if "unauthorized" in error_message.lower() or "permission" in error_message.lower():
            return "❌ I don't have permission to do that. Please check your settings."
        
        # Generic fallback
        return "❌ Sorry, something went wrong. Please try again or rephrase your request."


def explain_graphql_error(error_data: Dict[str, Any], user_message: str) -> str:
    """
    Explain GraphQL-specific errors without using LLM
    Quick fallback for common GraphQL errors
    """
    message = error_data.get('message', '')
    
    if 'failed to fetch skill' in message.lower():
        return "❌ I couldn't find that skill. Try starting a learning session to create it first."
    
    if 'already have an active session' in message.lower():
        return "❌ You already have a session running. Stop your current session before starting a new one."
    
    if 'not found' in message.lower():
        return "❌ I couldn't find what you're looking for. Please double-check and try again."
    
    if 'invalid' in message.lower():
        return "❌ Something in your request wasn't valid. Could you try rephrasing it?"
    
    if 'unauthorized' in message.lower():
        return "❌ I don't have permission to access that. Please check your settings."
    
    # Generic GraphQL error
    return f"❌ Sorry, I encountered an issue: {message[:100]}"
