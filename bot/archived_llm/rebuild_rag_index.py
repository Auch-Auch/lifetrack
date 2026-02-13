#!/usr/bin/env python3
"""
Rebuild RAG FAISS Index

Use this script to force rebuild the FAISS index with current examples.
Run this when:
- You've updated graphql_examples.yaml
- RAG is returning poor results
- You want to test retrieval quality
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from llm.rag_store import GraphQLRAGStore
from config import Config


def rebuild_index():
    """Rebuild FAISS index from scratch"""
    
    print("🔧 Rebuilding RAG FAISS Index...")
    print(f"   Schema: {Config.GRAPHQL_SCHEMA_PATH}")
    print(f"   Examples: {Config.GRAPHQL_EXAMPLES_PATH}")
    print(f"   Index: {Config.RAG_INDEX_PATH}")
    
    # Remove old index if exists
    if os.path.exists(Config.RAG_INDEX_PATH):
        print(f"\n🗑️  Removing old index: {Config.RAG_INDEX_PATH}")
        os.remove(Config.RAG_INDEX_PATH)
    
    # Create new RAG store (will build index)
    print("\n🏗️  Building new index...")
    rag_store = GraphQLRAGStore(
        schema_path=str(Config.GRAPHQL_SCHEMA_PATH),
        examples_path=str(Config.GRAPHQL_EXAMPLES_PATH),
        index_path=str(Config.RAG_INDEX_PATH)
    )
    
    print(f"\n✅ Index rebuilt successfully!")
    print(f"   Total documents: {len(rag_store.documents)}")
    print(f"   Examples: {len([d for d in rag_store.documents if d['type'] == 'example'])}")
    print(f"   Schema parts: {len([d for d in rag_store.documents if d['type'] == 'schema'])}")
    
    # Test retrieval
    print("\n🧪 Testing retrieval quality...")
    test_queries = [
        "Start math learning session",
        "Show my schedule for today",
        "What are my stats this week",
        "Create a new skill for Python"
    ]
    
    for query in test_queries:
        print(f"\n📝 Query: '{query}'")
        context = rag_store.get_relevant_context(query, max_examples=3)
        
        print(f"   Retrieved {len(context['examples'])} examples:")
        for i, ex in enumerate(context['examples'], 1):
            intent = ex.get('intent', 'N/A')[:60]
            score = ex.get('score', 0)
            print(f"      {i}. {intent}... (score: {score:.3f})")


if __name__ == '__main__':
    try:
        rebuild_index()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
