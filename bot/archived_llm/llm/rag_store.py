"""
RAG Vector Store for GraphQL Query Generation

Uses FAISS for semantic search over GraphQL schema and example queries
"""

import os
import pickle
import logging
from typing import List, Dict, Any, Tuple
import yaml
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class GraphQLRAGStore:
    """
    Vector store for GraphQL schema and examples using FAISS
    """
    
    def __init__(
        self,
        schema_path: str,
        examples_path: str,
        model_name: str = "all-MiniLM-L6-v2",
        index_path: str = None
    ):
        """
        Initialize RAG store
        
        Args:
            schema_path: Path to GraphQL schema file
            examples_path: Path to YAML file with example queries
            model_name: Sentence transformer model name
            index_path: Path to save/load FAISS index
        """
        self.schema_path = schema_path
        self.examples_path = examples_path
        self.index_path = index_path or "data/graphql_rag.index"
        
        # Load embedding model
        logger.info(f"Loading embedding model: {model_name}")
        self.embedding_model = SentenceTransformer(model_name)
        
        # Storage for documents
        self.documents: List[Dict[str, Any]] = []
        self.embeddings: np.ndarray = None
        self.index: faiss.Index = None
        
        # Load or build index
        if os.path.exists(self.index_path):
            self.load_index()
        else:
            self.build_index()
    
    def load_schema(self) -> str:
        """Load GraphQL schema from file"""
        with open(self.schema_path, 'r') as f:
            return f.read()
    
    def load_examples(self) -> List[Dict[str, Any]]:
        """Load example queries from YAML"""
        with open(self.examples_path, 'r') as f:
            data = yaml.safe_load(f)
            return data.get('examples', [])
    
    def build_index(self):
        """Build FAISS index from schema and examples"""
        logger.info("Building FAISS index...")
        
        # Load schema
        schema = self.load_schema()
        
        # Parse schema into chunks (queries, mutations, types)
        schema_docs = self._parse_schema_to_docs(schema)
        
        # Load example queries
        examples = self.load_examples()
        example_docs = self._parse_examples_to_docs(examples)
        
        # Combine all documents
        self.documents = schema_docs + example_docs
        
        # Create embeddings
        texts = [doc['text'] for doc in self.documents]
        logger.info(f"Creating embeddings for {len(texts)} documents...")
        self.embeddings = self.embedding_model.encode(
            texts,
            show_progress_bar=True,
            convert_to_numpy=True
        )
        
        # Build FAISS index
        dimension = self.embeddings.shape[1]
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(self.embeddings)
        
        logger.info(f"Index built with {self.index.ntotal} vectors")
        
        # Save index
        self.save_index()
    
    def _parse_schema_to_docs(self, schema: str) -> List[Dict[str, Any]]:
        """Parse GraphQL schema into searchable documents"""
        docs = []
        
        # Split by type definitions
        lines = schema.split('\n')
        current_block = []
        current_type = None
        
        for line in lines:
            stripped = line.strip()
            
            # Detect type definitions
            if stripped.startswith('type ') or stripped.startswith('input ') or stripped.startswith('enum '):
                # Save previous block
                if current_block and current_type:
                    docs.append({
                        'text': '\n'.join(current_block),
                        'type': 'schema',
                        'category': current_type,
                        'source': 'schema'
                    })
                
                # Start new block
                current_type = stripped.split()[1].replace('{', '').strip()
                current_block = [line]
            
            elif stripped.startswith('}'):
                if current_block:
                    current_block.append(line)
                    if current_type:
                        docs.append({
                            'text': '\n'.join(current_block),
                            'type': 'schema',
                            'category': current_type,
                            'source': 'schema'
                        })
                    current_block = []
                    current_type = None
            
            elif current_block:
                current_block.append(line)
        
        # Add Query and Mutation sections separately with descriptions
        docs.append({
            'text': '''GraphQL ROOT QUERIES (top-level fields in Query type):
- me: User! - Get current user info
- skills: [Skill!]! - List all user's skills  
- skill(id: UUID!): Skill - Get specific skill by ID
- activities(filter, limit, offset): ActivityConnection! - List activities with filters
- activity(id: UUID!): Activity - Get specific activity
- activeSession: Activity - Get currently active session (if any)
- events(startDate: Date!, endDate: Date!, type): [Event!]! - List events in date range
- event(id: UUID!): Event - Get specific event
- upcomingEvents(limit: Int): [Event!]! - Get upcoming events
- learningPlans: [LearningPlan!]! - List all learning plans
- learningPlan(id: UUID!): LearningPlan - Get specific learning plan
- notes(filter, limit, offset): NoteConnection! - List notes with filters
- note(id: UUID!): Note - Get specific note
- searchNotes(query: String!): [Note!]! - Full-text search in notes
- activityStats(startDate: Date!, endDate: Date!): ActivityStats! - Calculate statistics

IMPORTANT: These are the ONLY fields available at query root level. 
Schedule is NOT a root query - it's a nested field inside LearningPlan.''',
            'type': 'schema',
            'category': 'Query',
            'source': 'schema_summary'
        })
        
        docs.append({
            'text': '''GraphQL ROOT MUTATIONS (top-level fields in Mutation type):
- register, login - Authentication
- createSkill, updateSkill, deleteSkill - Skill management
- createActivity, updateActivity, deleteActivity - Activity management  
- startSession, pauseSession, resumeSession, stopSession - Session control
- createEvent, updateEvent, deleteEvent - Event/calendar management
- createLearningPlan, updateLearningPlan, deleteLearningPlan, generateSchedule - Learning plan management
- createNote, updateNote, deleteNote - Note management

IMPORTANT: These are the ONLY mutations available at root level.''',
            'type': 'schema',
            'category': 'Mutation',
            'source': 'schema_summary'
        })
        
        return docs
    
    def _parse_examples_to_docs(self, examples: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Parse example queries into searchable documents"""
        docs = []
        
        for example in examples:
            intent = example.get('intent', '')
            query = example.get('query', '')
            category = example.get('category', 'general')
            
            # Combine intent and query for better search
            combined_text = f"{intent}\n\nGraphQL Query:\n{query}"
            
            docs.append({
                'text': combined_text,
                'type': 'example',
                'category': category,
                'intent': intent,
                'query': query,
                'source': 'examples'
            })
        
        return docs
    
    def search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for relevant documents
        
        Args:
            query: User's natural language query
            k: Number of results to return
            
        Returns:
            List of relevant documents with scores
        """
        # Create query embedding
        query_embedding = self.embedding_model.encode([query], convert_to_numpy=True)
        
        # Search in FAISS
        distances, indices = self.index.search(query_embedding, k)
        
        # Gather results
        results = []
        for idx, distance in zip(indices[0], distances[0]):
            if idx < len(self.documents):
                doc = self.documents[idx].copy()
                doc['score'] = float(distance)
                results.append(doc)
        
        return results
    
    def get_relevant_context(self, query: str, max_examples: int = 3) -> Dict[str, Any]:
        """
        Get relevant context for query generation (optimized for Qwen 2.5 Coder)
        
        Args:
            query: User's message
            max_examples: Maximum number of example queries to return
            
        Returns:
            Dictionary with schema parts and example queries
        """
        # Pre-process query to improve retrieval for common ambiguous terms
        search_query = self._preprocess_query(query)
        
        logger.info(f"Query preprocessing: '{query}' → '{search_query}'")
        
        # Search for relevant documents with larger k to filter
        results = self.search(search_query, k=15)
        
        # Separate examples and schema
        all_examples = [r for r in results if r['type'] == 'example']
        all_schema = [r for r in results if r['type'] == 'schema']
        
        # Apply relevance threshold (L2 distance - lower is better)
        # Typical good matches: < 1.0, Okay matches: 1.0-1.5, Poor matches: > 1.5
        RELEVANCE_THRESHOLD = 1.5
        
        examples = []
        for example in all_examples:
            score = example.get('score', 999)
            if score < RELEVANCE_THRESHOLD:
                examples.append(example)
            else:
                logger.warning(f"Filtered out low-relevance example (score: {score:.3f}): {example.get('intent', 'N/A')[:50]}")
            
            if len(examples) >= max_examples:
                break
        
        # If we don't have enough good examples, loosen threshold
        if len(examples) < max_examples:
            logger.warning(f"Only {len(examples)} examples below threshold, including lower-quality matches")
            for example in all_examples[len(examples):]:
                examples.append(example)
                if len(examples) >= max_examples:
                    break
        
        # Get top schema parts
        schema_parts = all_schema[:3]
        
        return {
            'examples': examples,
            'schema_parts': schema_parts,
            'query': query
        }
    
    def _preprocess_query(self, query: str) -> str:
        """
        Pre-process query to handle ambiguous terms and boost relevant contexts
        
        Handles:
        - Session/activity queries (start, stop, pause)
        - Schedule queries (calendar events vs learning plans)
        - Stats/analytics queries
        """
        query_lower = query.lower()
        
        # Session/Activity queries - boost session-related terms
        session_keywords = ['start', 'begin', 'stop', 'end', 'pause', 'resume', 'session', 'practice', 'activity']
        if any(keyword in query_lower for keyword in session_keywords):
            # Disambiguate "learning session" from "learning plan"
            if 'learning' in query_lower and 'plan' not in query_lower:
                # It's a learning session, not a learning plan
                return f"{query} coding practice activity session startSession"
            # General session query
            return f"{query} activity session practice startSession stopSession"
        
        # Schedule/Calendar queries - default to events unless "learning plan" mentioned
        if ('schedule' in query_lower or 'calendar' in query_lower) and 'learning plan' not in query_lower:
            # Boost event-related terms
            return f"{query} calendar events today tomorrow week"
        
        # Stats queries - boost statistics terms
        if any(word in query_lower for word in ['stats', 'statistics', 'report', 'summary', 'hours', 'time spent']):
            return f"{query} statistics activityStats hours breakdown"
        
        # Notes queries
        if any(word in query_lower for word in ['note', 'notes', 'memo', 'remember']):
            return f"{query} notes createNote searchNotes"
        
        return query
    
    def save_index(self):
        """Save FAISS index and documents to disk"""
        os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
        
        # Save FAISS index
        faiss.write_index(self.index, self.index_path)
        
        # Save documents
        docs_path = self.index_path + '.docs.pkl'
        with open(docs_path, 'wb') as f:
            pickle.dump(self.documents, f)
        
        logger.info(f"Index saved to {self.index_path}")
    
    def load_index(self):
        """Load FAISS index and documents from disk"""
        logger.info(f"Loading index from {self.index_path}")
        
        # Load FAISS index
        self.index = faiss.read_index(self.index_path)
        
        # Load documents
        docs_path = self.index_path + '.docs.pkl'
        with open(docs_path, 'rb') as f:
            self.documents = pickle.load(f)
        
        logger.info(f"Index loaded with {self.index.ntotal} vectors")


# Utility function to initialize store
def get_rag_store(
    schema_path: str = "/backend/graph/schema.graphqls",
    examples_path: str = "schemas/graphql_examples.yaml"
) -> GraphQLRAGStore:
    """Get or create RAG store instance"""
    return GraphQLRAGStore(schema_path, examples_path)
