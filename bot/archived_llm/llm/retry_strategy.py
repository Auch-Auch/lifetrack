"""
Retry Strategy for LLM Query Generation

Handles retry logic with validation, backoff, and error context.
Consolidates retry behavior previously scattered across handlers.
"""

import logging
from typing import Dict, Any, Optional, Callable, List
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class RetryDecision(Enum):
    """Outcome of retry decision"""
    RETRY = "retry"  # Should retry with modified prompt
    FAIL = "fail"  # Give up and return error
    SUCCESS = "success"  # Operation succeeded


@dataclass
class RetryContext:
    """Context for a retry attempt"""
    attempt: int
    max_attempts: int
    original_query: str
    user_message: str
    last_error: Optional[str] = None
    last_query: Optional[str] = None
    validation_errors: List[str] = None
    
    def __post_init__(self):
        if self.validation_errors is None:
            self.validation_errors = []
    
    def has_retries_left(self) -> bool:
        """Check if more retries are available"""
        return self.attempt < self.max_attempts
    
    def record_failure(self, error: str, failed_query: Optional[str] = None):
        """Record a failed attempt"""
        self.last_error = error
        if failed_query:
            self.last_query = failed_query
        self.validation_errors.append(error)
    
    def is_repeated_error(self) -> bool:
        """Check if we're seeing the same error repeatedly"""
        if len(self.validation_errors) < 2:
            return False
        
        # Check if last two errors are similar
        last = self.validation_errors[-1]
        previous = self.validation_errors[-2]
        
        # Simple similarity check - can be improved
        return last == previous or self._extract_error_type(last) == self._extract_error_type(previous)
    
    def _extract_error_type(self, error: str) -> str:
        """Extract error type from error message"""
        if 'Cannot query field' in error:
            return 'cannot_query_field'
        if 'Unknown argument' in error:
            return 'unknown_argument'
        if 'Expected type' in error:
            return 'type_mismatch'
        return 'unknown'


class RetryStrategy:
    """
    Manages retry logic for LLM query generation
    
    Features:
    - Configurable retry limits
    - Validation-based retry decisions
    - Error context accumulation
    - Duplicate query detection
    """
    
    def __init__(
        self,
        max_attempts: int = 2,
        enable_validation: bool = True,
        fail_on_duplicate: bool = True
    ):
        """
        Initialize retry strategy
        
        Args:
            max_attempts: Maximum number of generation attempts
            enable_validation: Whether to validate queries before execution
            fail_on_duplicate: Fail if retry produces identical query
        """
        self.max_attempts = max_attempts
        self.enable_validation = enable_validation
        self.fail_on_duplicate = fail_on_duplicate
    
    def should_retry(
        self,
        context: RetryContext,
        error: str,
        failed_query: Optional[str] = None
    ) -> RetryDecision:
        """
        Decide whether to retry based on context and error
        
        Args:
            context: Current retry context
            error: Error message from failed attempt
            failed_query: The query that failed
            
        Returns:
            RetryDecision enum value
        """
        # Record the failure
        context.record_failure(error, failed_query)
        
        # Check if we have retries left
        if not context.has_retries_left():
            logger.info(f"Max retry attempts ({self.max_attempts}) reached")
            return RetryDecision.FAIL
        
        # Check if this is a repeated error
        if context.is_repeated_error():
            logger.warning("Repeated error detected - likely LLM cannot fix this")
            return RetryDecision.FAIL
        
        # Check error types that are worth retrying
        if self._is_retryable_error(error):
            logger.info(f"Error is retryable, attempt {context.attempt + 1}/{self.max_attempts}")
            return RetryDecision.RETRY
        
        # Non-retryable error
        logger.info(f"Error is not retryable: {error[:100]}")
        return RetryDecision.FAIL
    
    def check_duplicate_query(
        self,
        context: RetryContext,
        new_query: str
    ) -> bool:
        """
        Check if retry produced a duplicate query
        
        Args:
            context: Retry context with previous attempts
            new_query: Newly generated query
            
        Returns:
            True if duplicate detected
        """
        if not self.fail_on_duplicate:
            return False
        
        if context.last_query:
            # Normalize for comparison (remove whitespace differences)
            normalized_new = self._normalize_query(new_query)
            normalized_old = self._normalize_query(context.last_query)
            
            if normalized_new == normalized_old:
                logger.warning("Retry generated identical query - LLM is stuck")
                return True
        
        return False
    
    def _is_retryable_error(self, error: str) -> bool:
        """Determine if error type is worth retrying"""
        retryable_patterns = [
            'Cannot query field',  # Wrong field name - LLM can fix
            'Unknown argument',  # Wrong parameter - LLM can fix
            'Expected type',  # Type mismatch - LLM can fix
            'GRAPHQL_VALIDATION_FAILED',  # Generic validation - worth trying
        ]
        
        error_lower = error.lower()
        for pattern in retryable_patterns:
            if pattern.lower() in error_lower:
                return True
        
        # Non-retryable errors
        non_retryable_patterns = [
            'authentication',
            'authorization',
            'timeout',
            'network',
            'connection',
        ]
        
        for pattern in non_retryable_patterns:
            if pattern.lower() in error_lower:
                return False
        
        # Default to retryable for unknown errors
        return True
    
    def _normalize_query(self, query: str) -> str:
        """Normalize query for comparison"""
        import re
        # Remove all whitespace and newlines
        normalized = re.sub(r'\s+', ' ', query.strip())
        return normalized.lower()
    
    def create_context(self, user_message: str, original_query: str = "") -> RetryContext:
        """Create a new retry context"""
        return RetryContext(
            attempt=1,
            max_attempts=self.max_attempts,
            original_query=original_query,
            user_message=user_message
        )
    
    async def execute_with_retry(
        self,
        operation: Callable,
        context: RetryContext,
        on_retry: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """
        Execute an operation with automatic retry logic
        
        Args:
            operation: Async function to execute (takes RetryContext, returns result)
            context: Retry context
            on_retry: Optional callback before retry (takes context, error)
            
        Returns:
            Operation result
            
        Raises:
            Exception if all retries exhausted
        """
        last_error = None
        
        while context.has_retries_left():
            try:
                result = await operation(context)
                return result
                
            except Exception as e:
                error_str = str(e)
                failed_query = getattr(e, 'query', None)
                
                # Decide if we should retry
                decision = self.should_retry(context, error_str, failed_query)
                
                if decision == RetryDecision.FAIL:
                    raise
                
                # Call retry callback if provided
                if on_retry:
                    await on_retry(context, error_str)
                
                # Increment attempt counter
                context.attempt += 1
                last_error = e
                
                logger.info(f"Retrying operation (attempt {context.attempt}/{self.max_attempts})")
        
        # Exhausted retries
        if last_error:
            raise last_error
        else:
            raise RuntimeError("Retry logic failed without error")


class ValidationError(Exception):
    """Custom exception for validation failures"""
    
    def __init__(self, message: str, query: Optional[str] = None, errors: List[str] = None):
        super().__init__(message)
        self.query = query
        self.errors = errors or []


def create_retry_strategy(
    max_attempts: int = 2,
    enable_validation: bool = True
) -> RetryStrategy:
    """
    Factory function for creating retry strategy
    
    Args:
        max_attempts: Maximum retry attempts (default 2)
        enable_validation: Enable query validation (default True)
        
    Returns:
        RetryStrategy instance
    """
    return RetryStrategy(
        max_attempts=max_attempts,
        enable_validation=enable_validation,
        fail_on_duplicate=True
    )
