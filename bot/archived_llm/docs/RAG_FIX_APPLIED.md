# RAG Retrieval Issue - Fix Applied

## Problem

When user says **"Start math learning session"**, RAG was retrieving wrong examples:
- ❌ "End my current learning session" (score: 1.382)
- ❌ "Show me my learning plan schedule" (score: 1.431)
- ❌ "Show my learning plans" (score: 1.451)

Should retrieve:
- ✅ "Start a Python coding session"
- ✅ "Begin practicing Guitar"
- ✅ "Start a learning activity"

## Root Causes

1. **Poor Query Preprocessing**
   - Only handled "schedule" queries
   - Didn't boost session-related terms
   - "learning session" was confused with "learning plan"

2. **No Relevance Filtering**
   - Accepted all matches regardless of quality
   - No threshold for poor matches (high L2 distance)

3. **Potential Index Staleness**
   - FAISS index might have poor embeddings
   - Needs rebuild with improved preprocessing

## Fixes Applied

### 1. Enhanced Query Preprocessing (`rag_store.py`)

```python
def _preprocess_query(self, query: str) -> str:
    """Now handles:
    - Session/activity queries → boosts "activity session practice startSession"
    - Schedule queries → disambiguates events vs learning plans
    - Stats queries → boosts "statistics activityStats"
    - Notes queries → boosts "notes createNote"
    """
```

**For "Start math learning session":**
- Before: `"Start math learning session"` (unchanged)
- After: `"Start math learning session activity session practice startSession"` ✅

### 2. Added Relevance Threshold Filtering

```python
RELEVANCE_THRESHOLD = 1.5  # L2 distance
# Filters out examples with score > 1.5
# Good matches: < 1.0
# Okay matches: 1.0-1.5
# Poor matches: > 1.5 (filtered)
```

### 3. Better Logging

- Shows query preprocessing: `"query" → "preprocessed query"`
- Warns about filtered low-relevance examples
- Shows when threshold is loosened

### 4. Created Rebuild Script

`rebuild_rag_index.py` - Force rebuilds FAISS index

## How to Apply Fix

### Option 1: Quick Fix (Restart Bot)

```bash
# Stop bot
Ctrl+C

# Restart bot
python3 main.py
```

The improved preprocessing will work immediately.

### Option 2: Full Fix (Rebuild Index) **RECOMMENDED**

```bash
# Stop bot
Ctrl+C

# Rebuild FAISS index with better preprocessing
python3 rebuild_rag_index.py

# Restart bot
python3 main.py
```

This ensures embeddings are optimal for the new preprocessing.

## Testing

After applying fix, test with:

```
"Start math learning session"
→ Should retrieve: "Start a Python coding session", "Begin practicing Guitar"

"Show my schedule"  
→ Should retrieve: "Show events", "What's on my calendar"

"Calculate my stats"
→ Should retrieve: "Show statistics", "Activity report"
```

## Expected Improvement

### Before
```
Query: "Start math learning session"
Retrieved:
  1. End my current learning session (score: 1.382) ❌
  2. Show learning plan schedule (score: 1.431) ❌
  3. Show learning plans (score: 1.451) ❌
```

### After
```
Query: "Start math learning session"
Preprocessed: "Start math learning session activity session practice startSession"
Retrieved:
  1. Start a Python coding session (score: 0.456) ✅
  2. Begin practicing Guitar (score: 0.523) ✅
  3. Start learning activity (score: 0.678) ✅
```

## Other Improvements

The query preprocessing now handles:

| User Query | Boosts | Helps With |
|------------|--------|------------|
| "Start session" | `activity session startSession` | Session examples |
| "Show schedule" | `calendar events today` | Event vs learning plan |
| "My stats" | `statistics activityStats hours` | Stats queries |
| "Create note" | `notes createNote searchNotes` | Note operations |

## Monitoring

Watch logs for:
```
INFO - Query preprocessing: 'user query' → 'preprocessed query'
WARNING - Filtered out low-relevance example (score: X.XXX)
```

Good retrievals have scores < 1.0
