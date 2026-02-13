"""
Tests for prompt templates and PromptBuilder

Validates:
- Template loading
- Context injection
- Prompt generation
- Parameter extraction
"""

import pytest
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from llm.prompt_builder import PromptBuilder, get_prompt_builder
from config import Config


class TestPromptTemplates:
    """Test prompt template loading and rendering"""
    
    def test_load_templates(self):
        """Test that templates load successfully"""
        builder = get_prompt_builder()
        templates = builder.get_available_templates()
        
        assert len(templates) > 0, "No templates loaded"
        assert 'query_generation_v1' in templates
        assert 'error_recovery_v1' in templates
        assert 'clarification_v1' in templates
    
    def test_query_generation_prompt(self):
        """Test basic query generation prompt"""
        builder = get_prompt_builder()
        
        prompt, params = builder.build_query_generation_prompt(
            user_message="Show me my skills",
            schema_text="type Query { skills: [Skill!]! }",
            examples_text="# Example\nquery { skills { id name } }"
        )
        
        # Check prompt structure
        assert "<|im_start|>system" in prompt
        assert "<|im_start|>user" in prompt
        assert "<|im_start|>assistant" in prompt
        
        # Check content
        assert "Show me my skills" in prompt
        assert "skills" in prompt.lower()
        
        # Check parameters
        assert 'max_tokens' in params
        assert 'temperature' in params
        assert 'stop' in params
    
    def test_error_recovery_prompt(self):
        """Test error recovery prompt with validation error"""
        builder = get_prompt_builder()
        
        prompt, params = builder.build_query_generation_prompt(
            user_message="Show schedule",
            schema_text="type Query { events: [Event!]! }",
            examples_text="query { events { id title } }",
            validation_error='Cannot query field "schedule" on type "Query"',
            failed_query="query { schedule { id } }"
        )
        
        # Check error context is included
        assert "FAILED" in prompt or "ERROR" in prompt
        assert "schedule" in prompt
        assert "query { schedule" in prompt
        
        # Temperature should be slightly higher for retry
        assert params['temperature'] >= 0.2
    
    def test_format_examples(self):
        """Test example formatting"""
        builder = get_prompt_builder()
        
        examples = [
            {'intent': 'List all skills', 'query': 'query { skills { id name } }'},
            {'intent': 'Start session', 'query': 'mutation { startSession(...) }'}
        ]
        
        formatted = builder.format_examples(examples)
        
        assert "Example 1" in formatted
        assert "Example 2" in formatted
        assert "List all skills" in formatted
        assert "Start session" in formatted
    
    def test_format_schema(self):
        """Test schema formatting"""
        builder = get_prompt_builder()
        
        schema_parts = [
            {'text': 'type Query { skills: [Skill!]! }'},
            {'text': 'type Mutation { createSkill: Skill! }'}
        ]
        
        formatted = builder.format_schema(schema_parts)
        
        assert "Query" in formatted
        assert "Mutation" in formatted
        assert "skills" in formatted


class TestPromptGeneration:
    """Test end-to-end prompt generation"""
    
    def test_prompt_length(self):
        """Ensure prompts are reasonable length"""
        builder = get_prompt_builder()
        
        # Simulate RAG context
        schema = "type Query { skills: [Skill!]! }\ntype Skill { id: UUID! name: String! }"
        examples = "# Example\nquery { skills { id name } }"
        
        prompt, params = builder.build_query_generation_prompt(
            user_message="Show skills",
            schema_text=schema,
            examples_text=examples
        )
        
        # Check length is reasonable (not too short, not too long)
        assert len(prompt) > 100, "Prompt too short"
        assert len(prompt) < 8000, "Prompt too long (may exceed context)"
    
    def test_token_counts(self):
        """Test that max_tokens parameters are set correctly"""
        builder = get_prompt_builder()
        
        prompt, params = builder.build_query_generation_prompt(
            user_message="Test",
            schema_text="schema",
            examples_text="examples"
        )
        
        # Check max_tokens is reasonable for query generation
        assert params['max_tokens'] > 0
        assert params['max_tokens'] <= 512  # Should not generate huge query


class TestErrorGuidance:
    """Test error-specific guidance generation"""
    
    def test_startSession_guidance(self):
        """Test guidance for startSession mutation errors"""
        builder = get_prompt_builder()
        
        error = "Unknown argument 'startedAt' on field 'startSession'"
        failed_query = "mutation { startSession(skillId: \"...\", startedAt: \"...\") }"
        
        guidance = builder._generate_error_guidance(error, failed_query)
        
        assert "startSession" in guidance
        assert "skillId" in guidance or "name" in guidance
    
    def test_cannot_query_field_guidance(self):
        """Test guidance for 'Cannot query field' errors"""
        builder = get_prompt_builder()
        
        error = 'Cannot query field "schedule" on type "Query"'
        failed_query = "query { schedule { id } }"
        
        guidance = builder._generate_error_guidance(error, failed_query)
        
        assert "schedule" in guidance or "field" in guidance.lower()


def test_integration_with_config():
    """Test that PromptBuilder integrates with Config"""
    # Should use Config.SCHEMAS_DIR / 'prompts'
    builder = get_prompt_builder()
    
    assert builder.templates_dir.exists()
    assert len(builder.templates) > 0


if __name__ == '__main__':
    # Run tests
    pytest.main([__file__, '-v'])
