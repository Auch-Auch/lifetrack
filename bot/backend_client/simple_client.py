"""
Simplified GraphQL Client for RAG-based Query Execution

Executes raw GraphQL queries and handles entity resolution
"""

import logging
import re
from typing import Dict, Any, Optional, List
from difflib import get_close_matches
from gql import gql, Client
from gql.transport.aiohttp import AIOHTTPTransport

logger = logging.getLogger(__name__)


class GraphQLClient:
    """Simplified GraphQL client for executing raw queries with per-user auth"""
    
    def __init__(self, url: str, auth_token: Optional[str] = None, timeout: int = 10):
        self.url = url
        self.auth_token = auth_token
        self.timeout = timeout
        self._client = None
        self._update_client()
    
    def _update_client(self):
        """Update client with current auth token"""
        headers = {}
        if self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'
        
        transport = AIOHTTPTransport(
            url=self.url,
            headers=headers,
            timeout=self.timeout
        )
        
        self._client = Client(
            transport=transport,
            fetch_schema_from_transport=False,
            execute_timeout=self.timeout
        )
    
    def set_auth_token(self, token: str):
        """Update authentication token"""
        self.auth_token = token
        self._update_client()
    
    async def login(self, email: str, password: str) -> Dict[str, Any]:
        """Login and get authentication token"""
        query = """
        mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
                token
                user {
                    id
                    email
                    name
                }
            }
        }
        """
        
        variables = {
            "email": email,
            "password": password
        }
        
        try:
            result = await self.execute(query, variables)
            auth_payload = result.get('login')
            if auth_payload and auth_payload.get('token'):
                # Update client with new token
                self.set_auth_token(auth_payload['token'])
                return auth_payload
            else:
                raise ValueError("Login failed: no token received")
        except Exception as e:
            logger.error(f"Login error: {e}")
            raise ValueError(f"Login failed: {str(e)}")
    
    async def execute(
        self,
        query: str,
        variables: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute GraphQL query or mutation"""
        try:
            async with self._client as session:
                result = await session.execute(gql(query), variable_values=variables)
                return result
        except Exception as e:
            logger.error(f"GraphQL error: {e}")
            raise
    
    async def execute_with_resolution(
        self,
        query: str,
        variables: Optional[Dict[str, Any]] = None,
        user_message: str = ""
    ) -> Dict[str, Any]:
        """
        Execute query with automatic entity resolution
        
        Handles placeholders like SKILL_ID_PLACEHOLDER by resolving entities
        """
        import re
        
        # Check if query needs skill resolution (flexible pattern matching)
        # Matches: SKILL_ID_PLACEHOLDER, PYTHON_ID_PLACEHOLDER, MATH_ID_PLACEHOLDER, etc.
        skill_placeholder_pattern = r'["\']?(\w+_ID_PLACEHOLDER)["\']?'
        skill_matches = re.findall(skill_placeholder_pattern, query)
        
        if skill_matches:
            # Resolve skill from message
            logger.info(f"Detected skill placeholders: {skill_matches}. Resolving skill from message...")
            skill_id = await self._resolve_skill(user_message)
            if skill_id:
                # Replace all skill-related placeholders with the resolved ID
                for placeholder in skill_matches:
                    # Remove quotes from placeholder if present
                    query = query.replace(f'"{placeholder}"', f'"{skill_id}"')
                    query = query.replace(f"'{placeholder}'", f'"{skill_id}"')
                    query = query.replace(placeholder, f'"{skill_id}"')
                logger.info(f"Resolved skill ID: {skill_id}")
            else:
                raise ValueError(f"Could not find or create skill from message: {user_message}")
        
        # Check if query needs active session ID
        if 'ACTIVITY_ID_PLACEHOLDER' in query:
            activity_id = await self._resolve_active_session()
            if activity_id:
                query = query.replace('"ACTIVITY_ID_PLACEHOLDER"', f'"{activity_id}"')
                query = query.replace("'ACTIVITY_ID_PLACEHOLDER'", f'"{activity_id}"')
                query = query.replace('ACTIVITY_ID_PLACEHOLDER', f'"{activity_id}"')
            else:
                raise ValueError("No active session found")
        
        # Execute the resolved query
        return await self.execute(query, variables)
    
    async def _resolve_skill(self, user_message: str) -> Optional[str]:
        """
        Resolve skill ID from user message
        
        Tries to find existing skill by name with fuzzy matching.
        Raises ValueError with suggestions if no close match found.
        """
        # Extract skill name from message
        skill_name = self._extract_skill_name(user_message)
        
        if not skill_name:
            logger.warning(f"Could not extract skill name from: {user_message}")
            raise ValueError(
                "I couldn't identify which skill you want to use. "
                "Please specify the exact skill name from your existing skills."
            )
        
        # Get all skills
        skills_query = """
        query GetSkills {
            skills {
                id
                name
            }
        }
        """
        
        result = await self.execute(skills_query)
        skills = result.get('skills', [])
        
        if not skills:
            raise ValueError(
                "You don't have any skills yet. Please create a skill first using the web app or by saying "
                "'Create a new skill called [skill name]'"
            )
        
        # Try exact match (case-insensitive)
        for skill in skills:
            if skill['name'].lower() == skill_name.lower():
                logger.info(f"Found exact match: {skill['name']} (ID: {skill['id']})")
                return skill['id']
        
        # Try fuzzy matching
        skill_names = [s['name'] for s in skills]
        close_matches = get_close_matches(
            skill_name, 
            skill_names, 
            n=3, 
            cutoff=0.6  # 60% similarity
        )
        
        if close_matches:
            # Found similar skills
            if len(close_matches) == 1:
                # Single close match - use it
                matched_skill = next(s for s in skills if s['name'] == close_matches[0])
                logger.info(f"Fuzzy matched '{skill_name}' to '{matched_skill['name']}' (ID: {matched_skill['id']})")
                return matched_skill['id']
            else:
                # Multiple close matches - ask for clarification
                matches_list = ', '.join(f'"{m}"' for m in close_matches)
                raise ValueError(
                    f"I found '{skill_name}' in your message, but I'm not sure which skill you mean. "
                    f"Did you mean one of these: {matches_list}? Please specify the exact name."
                )
        
        # No close matches - list all skills
        all_skills_list = ', '.join(f'"{s["name"]}"' for s in skills[:10])
        if len(skills) > 10:
            all_skills_list += f' (and {len(skills) - 10} more)'
        
        raise ValueError(
            f"I couldn't find a skill matching '{skill_name}'. "
            f"Your existing skills are: {all_skills_list}. "
            f"Please use an exact skill name or create a new skill first."
        )
    
    async def _resolve_active_session(self) -> Optional[str]:
        """Get the ID of the current active session"""
        query = """
        query GetActiveSession {
            activeSession {
                id
            }
        }
        """
        
        result = await self.execute(query)
        active_session = result.get('activeSession')
        
        if active_session:
            return active_session['id']
        
        return None
    
    def _extract_skill_name(self, message: str) -> Optional[str]:
        """Extract skill name from user message using regex patterns"""
        patterns = [
            # "start a Python session"
            r'(?:start|begin|practice)\s+(?:a\s+)?([A-Za-z0-9\s]+?)\s+(?:session|practice|coding)',
            # "start session for Python"
            r'session\s+(?:for|with)\s+([A-Za-z0-9\s]+)',
            # "practicing Guitar"
            r'(?:practicing|learning|studying)\s+([A-Za-z0-9\s]+)',
            # "Python coding session"
            r'([A-Za-z0-9\s]+?)\s+(?:coding|practice|study|learning)\s+session',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                skill_name = match.group(1).strip()
                # Filter out common words
                if skill_name.lower() not in ['a', 'the', 'my', 'new', 'session']:
                    return skill_name
        
        # Fallback: look for capitalized words (likely skill names)
        words = message.split()
        for word in words:
            if word[0].isupper() and len(word) > 2 and word.lower() not in ['the', 'a', 'my', 'i']:
                return word
        
        return None
