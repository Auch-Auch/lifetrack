"""
Jinja2-based response formatter with LLM error fallback
"""
import yaml
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from jinja2 import Environment, Template, TemplateError, select_autoescape
from config import Config
from llm.template_helpers import TEMPLATE_FILTERS, TEMPLATE_GLOBALS
from llm.error_explainer import ErrorExplainer, explain_graphql_error

logger = logging.getLogger(__name__)


class ResponseFormatter:
    """Format GraphQL responses using Jinja2 templates with LLM error fallback"""
    
    def __init__(self, llm_model=None):
        """
        Initialize formatter
        
        Args:
            llm_model: Optional LLM model for error explanation
        """
        self.templates = self._load_templates()
        self.env = self._create_jinja_env()
        self.error_explainer = ErrorExplainer(llm_model) if llm_model else None
    
    def _create_jinja_env(self) -> Environment:
        """Create Jinja2 environment with custom filters and globals"""
        env = Environment(
            autoescape=select_autoescape(['html', 'xml']),
            trim_blocks=True,
            lstrip_blocks=True
        )
        
        # Register custom filters
        for name, filter_func in TEMPLATE_FILTERS.items():
            env.filters[name] = filter_func
        
        # Register global functions
        for name, global_func in TEMPLATE_GLOBALS.items():
            env.globals[name] = global_func
        
        return env
    
    def _load_templates(self) -> Dict[str, str]:
        """Load response templates from YAML file"""
        try:
            with open(Config.RESPONSE_TEMPLATES_PATH) as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Failed to load templates: {e}")
            return {}
    
    def format_response(
        self, 
        intent: Dict[str, Any], 
        data: Any,
        user_message: str = ""
    ) -> str:
        """
        Format GraphQL response using templates
        
        Args:
            intent: Parsed user intent
            data: GraphQL query result
            user_message: Original user message (for error context)
        
        Returns:
            Formatted response message
        """
        function_name = intent.get('function')
        
        # Detect template to use
        template_name = self._detect_template(function_name, data)
        template_str = self.templates.get(template_name)
        
        if not template_str:
            logger.warning(f"No template found for: {template_name}")
            return self._format_generic(data)
        
        try:
            # Prepare context for template
            context = self._prepare_context(data, intent)
            
            # Render template
            template = self.env.from_string(template_str)
            response = template.render(**context)
            
            return response.strip()
            
        except TemplateError as e:
            logger.error(f"Template rendering error: {e}")
            return self._format_generic(data)
        except Exception as e:
            logger.error(f"Error formatting response: {e}", exc_info=True)
            return "✅ Request completed successfully!"
    
    def format_error(
        self, 
        error: Exception,
        user_message: str,
        graphql_query: Optional[str] = None
    ) -> str:
        """
        Format error message using LLM or fallback
        
        Args:
            error: The exception that occurred
            user_message: Original user message
            graphql_query: GraphQL query that failed (if available)
        
        Returns:
            User-friendly error message
        """
        # Try GraphQL-specific error explanation first (fast)
        if hasattr(error, 'args') and len(error.args) > 0:
            error_data = error.args[0] if isinstance(error.args[0], dict) else {}
            if 'message' in error_data:
                quick_explanation = explain_graphql_error(error_data, user_message)
                if not quick_explanation.startswith("❌ Sorry, I encountered"):
                    return quick_explanation
        
        # Use LLM for complex errors if available
        if self.error_explainer:
            try:
                return self.error_explainer.explain_error(
                    error, 
                    user_message,
                    graphql_query
                )
            except Exception as llm_error:
                logger.error(f"LLM error explanation failed: {llm_error}")
        
        # Final fallback
        return self._simple_error_message(error)
    
    def _detect_template(self, function_name: Optional[str], data: Any) -> str:
        """Detect which template to use based on function name and data shape"""
        if function_name:
            return function_name
        
        # Detect from data structure
        if isinstance(data, dict):
            if 'events' in data:
                return 'query_schedule'
            elif 'skills' in data:
                return 'list_skills'
            elif 'activities' in data:
                return 'list_activities'
            elif 'activityStats' in data:
                return 'get_stats'
            elif 'notes' in data or 'searchNotes' in data:
                return 'list_notes'
        
        return 'default'
    
    def _prepare_context(self, data: Any, intent: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare context dictionary for template rendering"""
        context = {
            'data': data,
            'intent': intent,
            'params': intent.get('parameters', {}),
            'now': datetime.now(),
        }
        
        # Add specific helpers based on data type
        if isinstance(data, dict):
            # Flatten common fields to root context for easier access
            if 'activityStats' in data:
                context['stats'] = data['activityStats']
            
            # Add convenience flags
            context['has_data'] = bool(data)
            context['is_empty'] = not bool(data)
        
        return context
    
    def _format_generic(self, data: Any) -> str:
        """Generic formatting when no template matches"""
        if not data:
            return "✅ Done!"
        
        if isinstance(data, list) and len(data) == 0:
            return "No results found."
        
        if isinstance(data, dict):
            # Try to summarize dict data
            first_key = next(iter(data), None)
            if first_key and isinstance(data[first_key], list):
                count = len(data[first_key])
                return f"✅ Found {count} {first_key}."
        
        return "✅ Request completed successfully!"
    
    def _simple_error_message(self, error: Exception) -> str:
        """Simple error message without LLM"""
        error_message = str(error).lower()
        
        if "not found" in error_message:
            return "❌ I couldn't find what you're looking for."
        
        if "already" in error_message and "active" in error_message:
            return "❌ You already have an active session."
        
        if "unauthorized" in error_message or "permission" in error_message:
            return "❌ I don't have permission to do that."
        
        if "invalid" in error_message:
            return "❌ Something in your request wasn't valid."
        
        return "❌ Sorry, something went wrong. Please try again."


# Singleton instance for easy import
_formatter_instance = None


def get_formatter(llm_model=None) -> ResponseFormatter:
    """Get or create formatter singleton"""
    global _formatter_instance
    if _formatter_instance is None:
        _formatter_instance = ResponseFormatter(llm_model)
    return _formatter_instance


def format_response(intent: Dict[str, Any], data: Any, user_message: str = "") -> str:
    """Convenience function for backward compatibility"""
    formatter = get_formatter()
    return formatter.format_response(intent, data, user_message)


def format_error(error: Exception, user_message: str, graphql_query: Optional[str] = None) -> str:
    """Convenience function for error formatting"""
    formatter = get_formatter()
    return formatter.format_error(error, user_message, graphql_query)
