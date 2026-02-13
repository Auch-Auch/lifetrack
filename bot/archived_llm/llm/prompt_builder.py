"""
Prompt Builder for LLM Query Generation

Manages prompt templates, versioning, and context injection.
Separates prompt engineering from generation logic.
"""

import yaml
import logging
import re
from pathlib import Path
from typing import Dict, Any, Optional, List
from jinja2 import Environment, Template, TemplateError

logger = logging.getLogger(__name__)


class PromptTemplate:
    """Represents a versioned prompt template"""
    
    def __init__(self, template_path: Path):
        """Load template from YAML file"""
        self.path = template_path
        self.data = self._load_yaml(template_path)
        
        # Extract metadata
        self.version = self.data.get('version', '1.0')
        self.description = self.data.get('description', '')
        
        # Create Jinja2 templates
        self.env = Environment(trim_blocks=True, lstrip_blocks=True)
        self.system_template = self.env.from_string(self.data.get('system_prompt', ''))
        self.user_template = self.env.from_string(self.data.get('user_prompt', ''))
        self.assistant_template = self.env.from_string(self.data.get('assistant_prompt', ''))
        
        # Load generation parameters
        self.generation_params = self.data.get('generation_params', {})
        self.stop_sequences = self.data.get('stop_sequences', [])
        
        logger.info(f"Loaded prompt template: {template_path.name} (v{self.version})")
    
    def _load_yaml(self, path: Path) -> Dict[str, Any]:
        """Load YAML file with error handling"""
        try:
            with open(path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Failed to load template {path}: {e}")
            raise
    
    def render(self, context: Dict[str, Any]) -> str:
        """
        Render complete prompt with context
        
        Args:
            context: Dictionary with template variables
            
        Returns:
            Complete prompt string in ChatML format
        """
        try:
            system = self.system_template.render(**context).strip()
            user = self.user_template.render(**context).strip()
            assistant = self.assistant_template.render(**context).strip()
            
            # Build ChatML format
            prompt = f"<|im_start|>system\n{system}<|im_end|>\n"
            prompt += f"<|im_start|>user\n{user}<|im_end|>\n"
            prompt += f"<|im_start|>assistant\n{assistant}"
            
            return prompt
            
        except TemplateError as e:
            logger.error(f"Template rendering error: {e}")
            raise
    
    def get_generation_params(self, overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Get generation parameters with optional overrides"""
        params = self.generation_params.copy()
        params['stop'] = self.stop_sequences
        
        if overrides:
            params.update(overrides)
        
        return params


class PromptBuilder:
    """
    Manages prompt templates and builds prompts for LLM generation
    
    Handles:
    - Template loading and versioning
    - Context preparation (RAG, errors, etc.)
    - Error guidance generation
    - Prompt validation
    """
    
    def __init__(self, templates_dir: Path):
        """
        Initialize prompt builder
        
        Args:
            templates_dir: Directory containing prompt template YAML files
        """
        self.templates_dir = Path(templates_dir)
        self.templates: Dict[str, PromptTemplate] = {}
        
        # Load all templates
        self._load_templates()
    
    def _load_templates(self):
        """Load all YAML templates from directory"""
        if not self.templates_dir.exists():
            logger.warning(f"Templates directory not found: {self.templates_dir}")
            return
        
        for template_file in self.templates_dir.glob("*.yaml"):
            template_name = template_file.stem
            try:
                self.templates[template_name] = PromptTemplate(template_file)
            except Exception as e:
                logger.error(f"Failed to load template {template_name}: {e}")
    
    def build_query_generation_prompt(
        self,
        user_message: str,
        schema_text: str,
        examples_text: str,
        validation_error: Optional[str] = None,
        failed_query: Optional[str] = None,
        version: str = "v1"
    ) -> tuple[str, Dict[str, Any]]:
        """
        Build prompt for GraphQL query generation
        
        Args:
            user_message: User's natural language request
            schema_text: Relevant GraphQL schema
            examples_text: RAG-retrieved examples
            validation_error: Previous validation error (for retry)
            failed_query: Query that failed (for retry)
            version: Template version to use
            
        Returns:
            Tuple of (prompt_string, generation_params)
        """
        # Choose template based on retry status
        if validation_error and failed_query:
            template_name = f"error_recovery_{version}"
            if template_name not in self.templates:
                logger.warning(f"Template {template_name} not found, falling back to query_generation")
                template_name = f"query_generation_{version}"
        else:
            template_name = f"query_generation_{version}"
        
        template = self.templates.get(template_name)
        if not template:
            raise ValueError(f"Template not found: {template_name}")
        
        # Build context
        context = {
            'user_message': user_message,
            'schema_text': schema_text,
            'examples_text': examples_text,
        }
        
        # Add error context if retrying
        if validation_error and failed_query:
            context['validation_error'] = validation_error
            context['failed_query'] = failed_query
            context['error_guidance'] = self._generate_error_guidance(validation_error, failed_query)
            context['error_explanation'] = self._explain_error(validation_error)
            context['correction_strategy'] = self._get_correction_strategy(validation_error)
        
        # Render prompt
        prompt = template.render(context)
        params = template.get_generation_params()
        
        # Log prompt length for monitoring
        logger.debug(f"Generated prompt length: {len(prompt)} chars")
        
        return prompt, params
    
    def build_clarification_prompt(
        self,
        user_message: str,
        ambiguity_reason: str,
        version: str = "v1"
    ) -> tuple[str, Dict[str, Any]]:
        """Build prompt for clarification question generation"""
        template_name = f"clarification_{version}"
        template = self.templates.get(template_name)
        
        if not template:
            raise ValueError(f"Template not found: {template_name}")
        
        context = {
            'user_message': user_message,
            'ambiguity_reason': ambiguity_reason,
        }
        
        prompt = template.render(context)
        params = template.get_generation_params()
        
        return prompt, params
    
    def _generate_error_guidance(self, error: str, failed_query: str) -> str:
        """Generate specific guidance based on error type"""
        # Load guidance from template data
        template = self.templates.get('query_generation_v1')
        if not template:
            return "- Review the schema carefully\n- Follow the examples"
        
        guidance_map = template.data.get('error_guidance', {})
        
        # Detect error type
        if 'startSession' in failed_query:
            return guidance_map.get('startSession', guidance_map.get('default', ''))
        
        if 'Cannot query field' in error:
            field_name = self._extract_field_from_error(error)
            guidance = guidance_map.get('cannot_query_field', guidance_map.get('default', ''))
            return guidance.replace('{{ field_name }}', field_name)
        
        return guidance_map.get('default', '')
    
    def _explain_error(self, error: str) -> str:
        """Provide human-readable explanation of validation error"""
        if 'Cannot query field' in error:
            field = self._extract_field_from_error(error)
            return f"The field '{field}' doesn't exist at the Query root level."
        
        if 'Unknown argument' in error:
            return "One or more arguments are not accepted by this field."
        
        if 'Expected type' in error:
            return "Data type mismatch - check that values match expected types."
        
        return "The query structure doesn't match the schema."
    
    def _get_correction_strategy(self, error: str) -> str:
        """Get correction strategy for specific error"""
        template = self.templates.get('error_recovery_v1')
        if not template:
            return "Review the schema and fix the error."
        
        strategies = template.data.get('correction_strategies', {})
        
        if 'Cannot query field' in error:
            return strategies.get('cannot_query_field', strategies.get('default', ''))
        
        if 'Unknown argument' in error:
            return strategies.get('invalid_mutation_params', strategies.get('default', ''))
        
        if 'Expected type' in error:
            return strategies.get('type_mismatch', strategies.get('default', ''))
        
        return strategies.get('default', '')
    
    def _extract_field_from_error(self, error: str) -> str:
        """Extract field name from validation error message"""
        match = re.search(r'Cannot query field "([^"]+)"', error)
        if match:
            return match.group(1)
        return "unknown"
    
    def format_examples(self, examples: List[Dict[str, Any]]) -> str:
        """
        Format RAG-retrieved examples into clear prompt text
        
        Args:
            examples: List of example dicts with 'intent' and 'query'
            
        Returns:
            Formatted examples string
        """
        if not examples:
            return "No examples available."
        
        formatted = []
        for i, example in enumerate(examples, 1):
            intent = example.get('intent', 'Unknown intent')
            query = example.get('query', '')
            
            formatted.append(f"# Example {i}")
            formatted.append(f"# User says: \"{intent}\"")
            formatted.append(f"# Generate this query:")
            formatted.append(query)
            formatted.append("")  # Empty line between examples
        
        return '\n'.join(formatted)
    
    def format_schema(self, schema_parts: List[Dict[str, Any]]) -> str:
        """
        Format RAG-retrieved schema parts into prompt text
        
        Args:
            schema_parts: List of schema part dicts with 'text'
            
        Returns:
            Formatted schema string
        """
        if not schema_parts:
            return "No schema information available."
        
        return '\n\n'.join(part.get('text', '') for part in schema_parts)
    
    def get_available_templates(self) -> List[str]:
        """Get list of available template names"""
        return list(self.templates.keys())
    
    def reload_templates(self):
        """Reload all templates (useful for development)"""
        self.templates.clear()
        self._load_templates()
        logger.info(f"Reloaded {len(self.templates)} templates")


def get_prompt_builder(templates_dir: Optional[Path] = None) -> PromptBuilder:
    """
    Factory function to get PromptBuilder instance
    
    Args:
        templates_dir: Optional custom templates directory
        
    Returns:
        PromptBuilder instance
    """
    if templates_dir is None:
        from config import Config
        templates_dir = Config.SCHEMAS_DIR / 'prompts'
    
    return PromptBuilder(templates_dir)
