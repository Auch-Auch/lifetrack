# Archived LLM Components

This directory contains the LLM-based natural language processing components that were previously used in the bot.

## Why Archived?

The bot has transitioned to a **command-based UI approach** using inline keyboards and buttons. This provides:
- Faster response times (no LLM inference)
- More reliable operation (no parsing errors)
- Better user experience (visual guidance)
- Lower resource usage (no model loading)

## What's Archived Here?

### Core LLM Components

- **`llm/`** - All LLM modules
  - `model_loader.py` - Llama-cpp-python model loading
  - `graphql_generator.py` - LLM-based GraphQL query generation
  - `prompt_builder.py` - Prompt template management
  - `retry_strategy.py` - Error recovery and retry logic
  - `rag_store.py` - FAISS vector store for RAG
  - `response_formatter_new.py` - Response formatting with Jinja2
  - `intent_parser.py` - Intent classification (deprecated)
  - `error_explainer.py` - Error message generation (deprecated)
  - `template_helpers.py` - Template utilities

### Handlers

- **`handlers/message.py`** - Natural language message handler
  - Processes text messages using LLM
  - Generates GraphQL queries from user intent
  - Handles retry logic and error recovery

### Schemas & Templates

- **`schemas/prompts/`** - Versioned prompt templates (YAML)
  - `query_generation_v1.yaml` - Main GraphQL generation prompt
  - `error_recovery_v1.yaml` - Retry/recovery prompt
  - `clarification_v1.yaml` - Clarification question generation

- **`schemas/response_templates_jinja.yaml`** - Jinja2 response templates

### Tests & Scripts

- **`tests/test_prompts.py`** - Unit tests for prompt templates
- **`rebuild_rag_index.py`** - Script to rebuild FAISS index

### Documentation

- **`docs/PROMPT_ENGINEERING.md`** - Comprehensive prompt engineering guide
- **`docs/LLM_IMPROVEMENTS.md`** - Detailed implementation documentation
- **`docs/README_LLM_IMPROVEMENTS.md`** - Quick start for LLM features
- **`docs/RAG_FIX_APPLIED.md`** - RAG retrieval bug fix documentation
- **`docs/RAG_ARCHITECTURE.md`** - RAG system architecture
- **`docs/QWEN_CODER_OPTIMIZATION.md`** - Qwen model optimization guide
- **`docs/MIGRATION.md`** - Migration notes

## How to Re-enable LLM Features

If you want to restore natural language processing:

### 1. Move Files Back

```bash
cd /home/aleksandr/lifetrack/bot

# Move LLM modules back
mv archived_llm/llm/* llm/

# Move message handler back
mv archived_llm/handlers/message.py handlers/

# Move schemas back
mv archived_llm/schemas/prompts schemas/
mv archived_llm/schemas/response_templates_jinja.yaml schemas/
```

### 2. Update main.py

Uncomment these imports:
```python
from handlers import message
from llm.model_loader import load_model
from llm.rag_store import GraphQLRAGStore
```

Uncomment in `post_init()`:
```python
# Load LLM model
logger.info("Loading LLM model...")
model = load_model(Config.MODEL_PATH)
application.bot_data['llm_model'] = model

# Initialize RAG store
logger.info("Initializing RAG vector store...")
rag_store = GraphQLRAGStore(
    schema_path=str(Config.GRAPHQL_SCHEMA_PATH),
    examples_path=str(Config.GRAPHQL_EXAMPLES_PATH),
    index_path=str(Config.RAG_INDEX_PATH)
)
application.bot_data['rag_store'] = rag_store
```

Uncomment message handler registration:
```python
application.add_handler(MessageHandler(
    filters.TEXT & ~filters.COMMAND,
    message.handle_message
))
```

### 3. Ensure Dependencies Installed

```bash
pip install llama-cpp-python faiss-cpu sentence-transformers jinja2 pyyaml
```

### 4. Verify Model Path

Check that `Config.MODEL_PATH` points to your GGUF model file:
```python
MODEL_PATH = Path(__file__).parent.parent / "models" / "qwen2.5-coder-7b-instruct-q5_k_m.gguf"
```

### 5. Rebuild RAG Index (if needed)

```bash
python archived_llm/rebuild_rag_index.py
```

### 6. Start Bot

```bash
python main.py
```

The bot will now support both command-based UI and natural language!

## Hybrid Approach

You can run **both** modes simultaneously:
- Commands for common, quick actions
- Natural language for complex queries

The command-based UI will handle button presses while the message handler processes text.

## Architecture Comparison

### Command-Based (Current)

```
User Input → Command Handler → GraphQL Client → Backend → Response
            (~100ms)
```

### LLM-Based (Archived)

```
User Input → Message Handler → LLM Inference → Query Generation → 
RAG Context → Validation → Retry Logic → GraphQL Client → 
Backend → Response Formatting → Response
            (~2-4 seconds)
```

## Performance Comparison

| Metric | Command-Based | LLM-Based |
|--------|--------------|-----------|
| Response Time | < 1s | 2-4s |
| Success Rate | ~100% | ~85-95% |
| CPU Usage | Low | High |
| Memory Usage | ~100MB | ~4GB |
| Startup Time | < 1s | ~30s |
| Predictability | 100% | ~90% |

## When to Use Which

### Use Command-Based (Current):
✅ Quick, common actions  
✅ Visual guidance needed  
✅ Speed is critical  
✅ Resource-constrained environment  

### Use LLM-Based (Archived):
✅ Complex, multi-step queries  
✅ Ambiguous user input  
✅ Conversational interaction desired  
✅ Flexible query composition needed  

## Key Achievements (Archived Work)

The LLM implementation included:

✅ **Prompt Engineering:** Versioned YAML templates with Jinja2  
✅ **RAG Integration:** FAISS vector store for schema/example retrieval  
✅ **Error Recovery:** Intelligent retry with duplicate detection  
✅ **Metrics Tracking:** Success rates, timing, validation failures  
✅ **Testing:** Unit tests for prompt templates  
✅ **Documentation:** Comprehensive guides and troubleshooting  
✅ **Bug Fixes:** Placeholder format issues, RAG retrieval accuracy  

## Technical Debt

If re-enabling LLM, consider:

- [ ] Update dependencies (llama-cpp-python may have breaking changes)
- [ ] Re-test prompt templates with latest models
- [ ] Verify FAISS index compatibility
- [ ] Update GraphQL schema mappings
- [ ] Re-run test suite
- [ ] Check for deprecated Telegram bot API features

## Support

For questions about the archived LLM implementation:
1. Read the documentation in `docs/`
2. Check test files for usage examples
3. Review commit history for context

## License & Attribution

This work represents significant prompt engineering and LLM integration effort. The patterns and techniques may be useful for future LLM projects.

---

**Archive Date:** February 12, 2026  
**Reason:** Transition to command-based UI  
**Status:** Fully functional (as of archive date)  
**Restore Time:** ~10 minutes  
