"""
GraphQL Query Generator using RAG and LLM

Generates GraphQL queries directly from user messages using:
1. RAG retrieval of relevant schema and examples
2. LLM generation with context
3. Structured prompt management via PromptBuilder
4. Retry logic via RetryStrategy

Refactored for improved maintainability and prompt quality.
"""

import json
import logging
import re
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from llama_cpp import Llama
from graphql import parse, validate, build_schema, GraphQLError

from .rag_store import GraphQLRAGStore
from .prompt_builder import get_prompt_builder, PromptBuilder
from .retry_strategy import RetryContext, ValidationError
from config import Config
import time

logger = logging.getLogger(__name__)


class QueryGenerationMetrics:
    """Simple metrics for tracking query generation quality"""
    
    def __init__(self):
        self.total_queries = 0
        self.validation_failures = 0
        self.successful_generations = 0
        self.avg_generation_time = 0.0
        self.rag_retrieval_scores = []
    
    def log_generation(
        self,
        success: bool,
        generation_time: float,
        validation_failed: bool = False,
        rag_scores: list = None
    ):
        """Log a generation attempt"""
        self.total_queries += 1
        
        if success:
            self.successful_generations += 1
        
        if validation_failed:
            self.validation_failures += 1
        
        # Update average generation time
        self.avg_generation_time = (
            (self.avg_generation_time * (self.total_queries - 1) + generation_time)
            / self.total_queries
        )
        
        if rag_scores:
            self.rag_retrieval_scores.extend(rag_scores)
    
    def get_summary(self) -> dict:
        """Get metrics summary"""
        success_rate = (
            self.successful_generations / self.total_queries * 100
            if self.total_queries > 0 else 0.0
        )
        
        validation_failure_rate = (
            self.validation_failures / self.total_queries * 100
            if self.total_queries > 0 else 0.0
        )
        
        avg_rag_score = (
            sum(self.rag_retrieval_scores) / len(self.rag_retrieval_scores)
            if self.rag_retrieval_scores else 0.0
        )
        
        return {
            'total_queries': self.total_queries,
            'success_rate': f"{success_rate:.1f}%",
            'validation_failure_rate': f"{validation_failure_rate:.1f}%",
            'avg_generation_time': f"{self.avg_generation_time:.3f}s",
            'avg_rag_score': f"{avg_rag_score:.3f}"
        }


logger = logging.getLogger(__name__)


class GraphQLGenerator:
    """Generate GraphQL queries from natural language"""
    
    def __init__(self, model: Llama, rag_store: GraphQLRAGStore, prompt_builder: Optional[PromptBuilder] = None):
        """
        Initialize generator
        
        Args:
            model: Llama model instance
            rag_store: RAG store for context retrieval
            prompt_builder: Optional PromptBuilder instance (creates default if None)
        """
        self.model = model
        self.rag_store = rag_store
        self.prompt_builder = prompt_builder or get_prompt_builder()
        self._schema = None
        self.metrics = QueryGenerationMetrics()
        
        logger.info(f"GraphQLGenerator initialized with {len(self.prompt_builder.get_available_templates())} prompt templates")
        
    @property
    def schema(self):
        """Lazy load GraphQL schema for validation"""
        if self._schema is None:
            try:
                with open(self.rag_store.schema_path, 'r') as f:
                    schema_str = f.read()
                self._schema = build_schema(schema_str)
                logger.info("GraphQL schema loaded for validation")
            except Exception as e:
                logger.error(f"Failed to load GraphQL schema: {e}")
                self._schema = None
        return self._schema
    
    def generate_query(
        self, 
        user_message: str, 
        user_id: str, 
        retry_context: Optional[RetryContext] = None
    ) -> Dict[str, Any]:
        """
        Generate GraphQL query from user message
        
        Args:
            user_message: User's natural language message
            user_id: User ID for context
            retry_context: Optional retry context (for error recovery)
            
        Returns:
            Dictionary with:
            - query: GraphQL query string
            - variables: Optional variables dict
            - needs_clarification: Boolean if clarification needed
            - clarification_question: Question to ask user
            - validation_failed: Boolean if validation failed
            - validation_errors: List of validation errors
        """
        start_time = time.time()
        
        # Reset model context/cache for fresh inference
        try:
            self.model.reset()
            logger.debug("Model context reset")
        except Exception as e:
            logger.debug(f"Model reset not available or failed: {e}")
        
        # Get relevant context from RAG
        rag_context = self.rag_store.get_relevant_context(user_message)
        
        # Extract RAG scores for metrics
        rag_scores = [ex.get('score', 0) for ex in rag_context['examples']]
        
        # Log RAG retrieval results
        logger.info(f"RAG retrieved {len(rag_context['examples'])} examples and {len(rag_context['schema_parts'])} schema parts")
        for i, example in enumerate(rag_context['examples'], 1):
            logger.info(f"  Example {i}: {example.get('intent', 'N/A')[:50]}... (score: {example.get('score', 0):.3f})")
        
        # Build prompt using PromptBuilder
        prompt, gen_params = self._build_prompt_with_builder(
            user_message, 
            rag_context, 
            retry_context
        )
        
        try:
            # Generate with parameters from template
            response = self.model(
                prompt,
                echo=False,
                **gen_params
            )
            
            generated_text = response['choices'][0]['text'].strip()
            logger.info(f"LLM generated text (first 200 chars): {generated_text[:200]}")
            logger.debug(f"Full LLM output: {generated_text}")
            
            # Parse the response with improved parsing
            result = self._parse_response(generated_text, user_id)
            logger.info(f"Parse result: needs_clarification={result.get('needs_clarification', False)}, has_query={'query' in result}")
            
            # Log metrics
            generation_time = time.time() - start_time
            validation_failed = result.get('validation_failed', False)
            success = not result.get('needs_clarification', False) and not validation_failed
            
            self.metrics.log_generation(
                success=success,
                generation_time=generation_time,
                validation_failed=validation_failed,
                rag_scores=rag_scores
            )
            
            # Log metrics summary periodically
            if self.metrics.total_queries % 10 == 0:
                logger.info(f"Query Generation Metrics: {self.metrics.get_summary()}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating query: {e}", exc_info=True)
            
            # Log failed generation
            generation_time = time.time() - start_time
            self.metrics.log_generation(
                success=False,
                generation_time=generation_time,
                rag_scores=rag_scores
            )
            
            return {
                'needs_clarification': True,
                'clarification_question': "I couldn't understand that. Could you rephrase your request?"
            }
    
    def _build_prompt_with_builder(
        self, 
        user_message: str, 
        rag_context: Dict[str, Any],
        retry_context: Optional[RetryContext] = None
    ) -> tuple[str, Dict[str, Any]]:
        """
        Build prompt using PromptBuilder
        
        Args:
            user_message: User's message
            rag_context: RAG-retrieved context
            retry_context: Optional retry context for error recovery
            
        Returns:
            Tuple of (prompt_string, generation_params)
        """
        # Format RAG context using PromptBuilder helpers
        examples_text = self.prompt_builder.format_examples(rag_context['examples'])
        schema_text = self.prompt_builder.format_schema(rag_context['schema_parts'])
        
        # Extract retry parameters if present
        validation_error = None
        failed_query = None
        
        if retry_context:
            validation_error = retry_context.last_error
            failed_query = retry_context.last_query
        
        # Build prompt using template
        prompt, gen_params = self.prompt_builder.build_query_generation_prompt(
            user_message=user_message,
            schema_text=schema_text,
            examples_text=examples_text,
            validation_error=validation_error,
            failed_query=failed_query,
            version="v1"
        )
        
        logger.debug(f"Built prompt: {len(prompt)} chars, params: {gen_params}")
        
        return prompt, gen_params
    
    def _parse_response(self, generated_text: str, user_id: str) -> Dict[str, Any]:
        """
        Parse LLM response with improved structure handling
        
        Args:
            generated_text: Raw LLM output
            user_id: User ID for context
            
        Returns:
            Parsed result dictionary
        """
        # Check for clarification request
        if generated_text.startswith("CLARIFY:"):
            question = generated_text.replace("CLARIFY:", "").strip()
            logger.info(f"LLM requested clarification: {question}")
            return {
                'needs_clarification': True,
                'clarification_question': question if question else "Could you provide more details?"
            }
        
        # Extract GraphQL query with improved parsing
        query = self._extract_query_structured(generated_text)
        
        if not query:
            logger.warning("Query extraction failed from LLM output")
            return {
                'needs_clarification': True,
                'clarification_question': "I couldn't generate a valid query. Could you rephrase?"
            }
        
        # Process placeholders
        query, variables = self._process_placeholders(query, user_id)
        
        # Validate query before returning
        validation_errors = self._validate_query(query)
        if validation_errors:
            logger.warning(f"Generated query failed validation: {validation_errors}")
            return {
                'query': query,
                'variables': variables,
                'needs_clarification': False,
                'validation_failed': True,
                'validation_errors': validation_errors
            }
        
        return {
            'query': query,
            'variables': variables,
            'needs_clarification': False
        }
    
    def _extract_query_structured(self, text: str) -> Optional[str]:
        """
        Extract GraphQL query using structured parsing approach
        
        Handles:
        - Markdown code blocks
        - Conversational prefixes
        - Malformed output
        
        Args:
            text: Raw LLM output
            
        Returns:
            Extracted query string or None
        """
        text = text.strip()
        
        # Step 1: Remove markdown code blocks
        # Match ```graphql ... ``` or ``` ... ```
        code_block_match = re.search(r'```(?:graphql)?\s*(.*?)```', text, re.DOTALL)
        if code_block_match:
            text = code_block_match.group(1).strip()
        
        # Step 2: Remove conversational prefixes
        # Remove common prefixes like "Sure!", "Here's", "Yes,", etc.
        conversational_pattern = r'^(Sure[,!]?\s*|Here\'s\s+|Yes[,!]?\s*|Okay[,!]?\s*|Certainly[,!]?\s*)+'
        text = re.sub(conversational_pattern, '', text, flags=re.IGNORECASE).strip()
        
        # Step 3: Find GraphQL query/mutation
        # Look for query { ... } or mutation { ... } or just { ... }
        if text.startswith(('query', 'mutation', '{')):
            # Already starts with valid GraphQL
            return self._validate_brackets(text)
        
        # Step 4: Search for query/mutation keyword in text
        for keyword in ['query', 'mutation']:
            pattern = rf'({keyword}\s+\w*\s*\{{.*?\}})'
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                extracted = match.group(1)
                return self._validate_brackets(extracted)
        
        # Step 5: Look for any {...} block (anonymous query)
        brace_match = re.search(r'\{.*\}', text, re.DOTALL)
        if brace_match:
            extracted = brace_match.group(0)
            return self._validate_brackets(extracted)
        
        # Could not extract valid query
        logger.warning(f"Failed to extract GraphQL from: {text[:200]}")
        return None
    
    def _validate_brackets(self, query: str) -> Optional[str]:
        """
        Validate bracket matching in query
        
        Args:
            query: Query string to validate
            
        Returns:
            Query if valid, None if brackets don't match
        """
        # Count opening and closing braces
        open_count = query.count('{')
        close_count = query.count('}')
        
        if open_count != close_count:
            logger.warning(f"Bracket mismatch: {open_count} open, {close_count} close")
            return None
        
        if open_count == 0:
            logger.warning("No braces found in query")
            return None
        
        return query.strip()
    
    def _process_placeholders(self, query: str, user_id: str) -> tuple:
        """Process placeholders in query and extract variables"""
        
        variables = {}
        
        # Date placeholders
        today = datetime.now().date()
        tomorrow = today + timedelta(days=1)
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        month_start = today.replace(day=1)
        
        # Replace placeholders with unquoted dates first
        replacements = {
            'TODAY_PLACEHOLDER': today.isoformat(),
            'TOMORROW_PLACEHOLDER': tomorrow.isoformat(),
            'WEEK_START_PLACEHOLDER': week_start.isoformat(),
            'WEEK_END_PLACEHOLDER': week_end.isoformat(),
            'MONTH_START_PLACEHOLDER': month_start.isoformat(),
        }
        
        for placeholder, value in replacements.items():
            # Replace both quoted and unquoted placeholder variants
            query = query.replace(f'"{placeholder}"', value)
            query = query.replace(placeholder, value)
        
        # Add quotes to all unquoted ISO dates and timestamps
        # Pattern: date_field: 2026-02-11 → date_field: "2026-02-11"
        # But skip if already quoted: date_field: "2026-02-11" stays unchanged
        import re
        query = re.sub(
            r'((?:start|end)?(?:Date|Time|At)|date|time|createdAt|updatedAt|pausedAt):\s*(?!")(\d{4}-\d{2}-\d{2}(?:T[\d:]+(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?)',
            r'\1: "\2"',
            query
        )
        
        # Remove common invalid parameters that LLM sometimes adds
        # startSession should only have skillId and name, not startedAt, duration, skill object, etc.
        if 'startSession(' in query:
            original_query = query
            
            # Remove invalid scalar parameters (single line)
            query = re.sub(
                r'^\s*(startedAt|endedAt|duration|date|pausedAt|pausedDuration|createdAt|updatedAt):\s*[^\n]+\n',
                '',
                query,
                flags=re.MULTILINE
            )
            
            # Remove invalid nested object parameters (multi-line)
            # Pattern: skill: { ... } or user: { ... } etc.
            # Use [\s\S] to match any character including newlines
            query = re.sub(
                r'^\s*(skill|user|activity):\s*\{[\s\S]*?\}\s*\n',
                '',
                query,
                flags=re.MULTILINE
            )
            
            if query != original_query:
                logger.info("Removed invalid parameters from startSession mutation")
        
        # Note: SKILL_ID_PLACEHOLDER, ACTIVITY_ID_PLACEHOLDER, etc. will be handled
        # by the client which will need to resolve these (e.g., by querying skills first)
        
        return query, variables
        
        return query, variables
    
    def needs_entity_resolution(self, query: str) -> Dict[str, Any]:
        """
        Check if query needs entity resolution (e.g., finding skill by name)
        
        Returns dict with:
        - needs_resolution: bool
        - entity_type: str (skill, activity, etc.)
        - resolution_query: GraphQL query to resolve entity
        """
        if 'SKILL_ID_PLACEHOLDER' in query:
            return {
                'needs_resolution': True,
                'entity_type': 'skill',
                'placeholder': 'SKILL_ID_PLACEHOLDER',
                'resolution_query': 'query { skills { id name } }'
            }
        
        if 'ACTIVITY_ID_PLACEHOLDER' in query:
            return {
                'needs_resolution': True,
                'entity_type': 'activity',
                'placeholder': 'ACTIVITY_ID_PLACEHOLDER',
                'resolution_query': 'query { activeSession { id } }'
            }
        
        if 'EVENT_ID_PLACEHOLDER' in query:
            return {
                'needs_resolution': True,
                'entity_type': 'event',
                'placeholder': 'EVENT_ID_PLACEHOLDER',
                'resolution_query': 'query { upcomingEvents(limit: 10) { id title } }'
            }
        
        return {'needs_resolution': False}
    
    def _validate_query(self, query: str) -> List[str]:
        """Validate GraphQL query against schema
        
        Args:
            query: GraphQL query string to validate
            
        Returns:
            List of validation error messages (empty if valid)
        """
        if not self.schema:
            logger.warning("Schema not available, skipping validation")
            return []
        
        try:
            # Parse the query
            document = parse(query)
            
            # Validate against schema
            errors = validate(self.schema, document)
            
            if errors:
                error_messages = [str(error.message) for error in errors]
                logger.warning(f"Query validation failed: {error_messages}")
                return error_messages
            
            logger.debug("Query validation passed")
            return []
            
        except Exception as e:
            logger.error(f"Error validating query: {e}")
            return [f"Parse error: {str(e)}"]


def extract_skill_name_from_message(message: str) -> Optional[str]:
    """Extract skill name from user message"""
    # Simple extraction - could be improved with NER
    patterns = [
        r'(?:skill|practice|session|for|with)\s+(?:called\s+)?(?:the\s+)?([A-Za-z0-9\s]+?)(?:\s+at|\s+level|$)',
        r'start\s+(?:a\s+)?([A-Za-z0-9\s]+?)\s+(?:session|practice)',
        r'(?:practicing|learning)\s+([A-Za-z0-9\s]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    
    return None
