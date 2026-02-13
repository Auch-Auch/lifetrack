import logging
from typing import Dict, Any
from telegram import Update
from telegram.ext import ContextTypes

from llm.graphql_generator import GraphQLGenerator
from llm.response_formatter_new import ResponseFormatter
from llm.retry_strategy import create_retry_strategy, RetryContext

logger = logging.getLogger(__name__)

# Global instances
_formatter = None
_generator = None
_retry_strategy = None


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle incoming text messages using RAG-based GraphQL generation with retry strategy"""
    user_message = update.message.text
    user_id = str(update.effective_user.id)
    
    logger.info(f"Received message from {user_id}: {user_message}")
    
    # Show typing indicator
    await update.message.chat.send_action(action="typing")
    
    try:
        # Get dependencies from bot_data
        llm_model = context.bot_data.get('llm_model')
        gql_client = context.bot_data.get('gql_client')
        rag_store = context.bot_data.get('rag_store')
        
        if not llm_model or not gql_client or not rag_store:
            await update.message.reply_text(
                "❌ Bot is not fully initialized. Please try again in a moment."
            )
            return
        
        # Initialize global instances
        global _formatter, _generator, _retry_strategy
        if _formatter is None:
            _formatter = ResponseFormatter(llm_model)
        if _generator is None:
            _generator = GraphQLGenerator(llm_model, rag_store)
        if _retry_strategy is None:
            _retry_strategy = create_retry_strategy(max_attempts=2)
        
        # Generate GraphQL query with automatic retry on validation errors
        logger.info("Generating GraphQL query with RAG...")
        result = await _generate_with_retry(
            _generator,
            _retry_strategy,
            user_message,
            user_id,
            gql_client
        )
        
        if result.get('needs_clarification'):
            clarification = result.get('clarification_question', 'Could you please clarify?')
            await update.message.reply_text(f"🤔 {clarification}")
            return
        
        if result.get('error'):
            await update.message.reply_text(f"❌ {result['error']}")
            return
        
        # Get the executed result
        graphql_result = result.get('result')
        
        # Check if this is a query for activeSession that needs a follow-up mutation
        graphql_result, needs_followup = await _handle_session_operations(
            graphql_result, user_message, gql_client, update
        )
        
        if needs_followup:
            logger.info("Follow-up mutation was executed")
        
        # Format response
        logger.info("Formatting response...")
        response = _format_graphql_response(graphql_result, user_message)
        
        # Send response (handle long messages)
        if len(response) > 4096:
            for i in range(0, len(response), 4096):
                await update.message.reply_text(response[i:i+4096])
        else:
            await update.message.reply_text(response)
        
    except Exception as e:
        logger.error(f"Error processing message: {e}", exc_info=True)
        
        # Use LLM to explain error in user-friendly way
        try:
            if _formatter:
                error_message = _formatter.format_error(e, user_message)
            else:
                error_message = "❌ Sorry, I encountered an error. Please try again."
        except Exception as format_error:
            logger.error(f"Error formatting error message: {format_error}")
            error_message = "❌ Sorry, something went wrong. Please try again."
        
        await update.message.reply_text(error_message)


async def _generate_with_retry(
    generator: GraphQLGenerator,
    retry_strategy,
    user_message: str,
    user_id: str,
    gql_client
) -> dict:
    """
    Generate and execute GraphQL query with automatic retry on validation errors
    
    Args:
        generator: GraphQLGenerator instance
        retry_strategy: RetryStrategy instance
        user_message: User's message
        user_id: User ID
        gql_client: GraphQL client for execution
        
    Returns:
        Dictionary with result or error
    """
    # Create retry context
    retry_context = retry_strategy.create_context(user_message)
    
    while retry_context.has_retries_left():
        try:
            # Generate query
            logger.info(f"Generating query (attempt {retry_context.attempt}/{retry_context.max_attempts})")
            query_result = generator.generate_query(
                user_message,
                user_id,
                retry_context if retry_context.attempt > 1 else None
            )
            
            # Check for clarification
            if query_result.get('needs_clarification'):
                return query_result
            
            # Check for validation failure
            if query_result.get('validation_failed'):
                validation_errors = query_result.get('validation_errors', [])
                failed_query = query_result.get('query')
                error_str = '; '.join(validation_errors)
                
                # Check if we should retry
                decision = retry_strategy.should_retry(retry_context, error_str, failed_query)
                
                if decision.value == 'fail':
                    logger.error("Retry strategy says to fail")
                    return {
                        'needs_clarification': True,
                        'clarification_question': "I'm having trouble generating a valid query. Could you rephrase?"
                    }
                
                # Check for duplicate query
                if retry_strategy.check_duplicate_query(retry_context, failed_query):
                    logger.error("Duplicate query detected")
                    return {
                        'needs_clarification': True,
                        'clarification_question': "I'm stuck on this request. Please try rephrasing it differently."
                    }
                
                # Retry with updated context
                retry_context.attempt += 1
                continue
            
            # Execute query
            graphql_query = query_result.get('query')
            variables = query_result.get('variables', {})
            
            logger.info(f"Executing GraphQL query:\n{graphql_query}")
            
            result = await gql_client.execute_with_resolution(
                graphql_query,
                variables,
                user_message
            )
            
            logger.info(f"Query executed successfully")
            return {'result': result}
            
        except Exception as e:
            error_str = str(e)
            
            # Check if it's a retryable error
            if retry_strategy._is_retryable_error(error_str):
                logger.warning(f"Retryable execution error: {error_str}")
                
                # Record failure and check if should retry
                decision = retry_strategy.should_retry(
                    retry_context,
                    error_str,
                    query_result.get('query') if 'query_result' in locals() else None
                )
                
                if decision.value == 'fail':
                    raise
                
                # Retry
                retry_context.attempt += 1
                continue
            else:
                # Non-retryable error
                raise
    
    # Exhausted retries
    return {
        'error': "I tried multiple times but couldn't generate a valid query. Please rephrase your request."
    }


async def _handle_session_operations(result: dict, user_message: str, gql_client, update) -> tuple:
    """
    Handle two-step session operations (query activeSession then mutate)
    
    Returns: (result, needs_followup)
    """
    logger.debug(f"_handle_session_operations called with result keys: {list(result.keys()) if result else 'None'}")
    
    # Check if result contains activeSession
    if not result or 'activeSession' not in result:
        logger.debug("No activeSession in result, skipping follow-up")
        return result, False
    
    active_session = result['activeSession']
    if not active_session or not active_session.get('id'):
        logger.info("No active session found")
        # No active session
        return result, False
    
    session_id = active_session['id']
    user_message_lower = user_message.lower()
    
    logger.info(f"Active session found with ID: {session_id}, detecting intent from: '{user_message}'")
    
    # Detect intent from user message
    mutation_query = None
    success_message = None
    
    if any(word in user_message_lower for word in ['stop', 'end', 'finish', 'complete']):
        mutation_query = f'''mutation StopSession {{
          stopSession(id: "{session_id}", notes: "Completed") {{
            id
            name
            duration
            status
            skill {{
              name
            }}
          }}
        }}'''
        logger.info(f"Detected stop intent, executing stopSession mutation...")
        
    elif 'pause' in user_message_lower:
        mutation_query = f'''mutation PauseSession {{
          pauseSession(id: "{session_id}") {{
            id
            name
            status
            pausedAt
            skill {{
              name
            }}
          }}
        }}'''
        logger.info(f"Detected pause intent, executing pauseSession mutation...")
        
    elif 'resume' in user_message_lower or 'continue' in user_message_lower:
        mutation_query = f'''mutation ResumeSession {{
          resumeSession(id: "{session_id}") {{
            id
            name
            status
            skill {{
              name
            }}
          }}
        }}'''
        logger.info(f"Detected resume intent, executing resumeSession mutation...")
    
    # If we identified a mutation, execute it
    if mutation_query:
        logger.info(f"Executing follow-up mutation:\n{mutation_query}")
        try:
            await update.message.chat.send_action(action="typing")
            mutation_result = await gql_client.execute(mutation_query, {})
            logger.info(f"Mutation executed successfully, result keys: {list(mutation_result.keys()) if mutation_result else 'None'}")
            return mutation_result, True
        except Exception as e:
            logger.error(f"Error executing session mutation: {e}")
            # Fall back to showing the active session info
            return result, False
    
    logger.info("No mutation intent detected, returning activeSession info")
    return result, False


def _format_graphql_response(result: dict, user_message: str) -> str:
    """
    Format GraphQL response into user-friendly message
    
    This is a simple formatter - can be enhanced with templates
    """
    if not result:
        return "✅ Done!"
    
    # Get the first key from result (usually the query/mutation name)
    keys = list(result.keys())
    if not keys:
        return "✅ Done!"
    
    operation = keys[0]
    data = result[operation]
    
    # Handle different response types
    if data is None:
        # Special handling for activeSession when it's null (no active session)
        if 'activesession' in operation.lower():
            return "ℹ️ You don't have an active learning session right now."
        return "✅ Done!"
    
    if isinstance(data, bool):
        return "✅ Completed successfully!" if data else "❌ Operation failed"
    
    if isinstance(data, dict):
        return _format_dict_response(data, operation)
    
    if isinstance(data, list):
        return _format_list_response(data, operation)
    
    return f"✅ Result: {data}"


def _format_dict_response(data: dict, operation: str) -> str:
    """Format a dictionary response"""
    lines = []
    
    # Special handling for common operations
    if 'stopSession' in operation or 'stop' in operation.lower():
        skill_name = data.get('skill', {}).get('name', 'Unknown')
        activity_name = data.get('name', 'Session')
        duration = data.get('duration', 0)
        lines.append(f"⏹️ Stopped: {activity_name}")
        lines.append(f"📚 Skill: {skill_name}")
        if duration:
            hours = duration // 60
            minutes = duration % 60
            if hours > 0:
                lines.append(f"⏱️ Duration: {hours}h {minutes}m")
            else:
                lines.append(f"⏱️ Duration: {minutes}m")
    
    elif 'pauseSession' in operation or 'pause' in operation.lower():
        skill_name = data.get('skill', {}).get('name', 'Unknown')
        activity_name = data.get('name', 'Session')
        lines.append(f"⏸️ Paused: {activity_name}")
        lines.append(f"📚 Skill: {skill_name}")
    
    elif 'resumeSession' in operation or 'resume' in operation.lower():
        skill_name = data.get('skill', {}).get('name', 'Unknown')
        activity_name = data.get('name', 'Session')
        lines.append(f"▶️ Resumed: {activity_name}")
        lines.append(f"📚 Skill: {skill_name}")
    
    elif 'activeSession' in operation or 'active' in operation.lower():
        # Display current active session details
        skill_name = data.get('skill', {}).get('name', 'Unknown')
        activity_name = data.get('name', 'Session')
        status = data.get('status', 'ACTIVE')
        duration = data.get('duration', 0)
        started_at = data.get('startedAt', '')
        
        lines.append(f"📚 Active Session: {activity_name}")
        lines.append(f"🎯 Skill: {skill_name}")
        lines.append(f"📊 Status: {status}")
        
        if duration:
            hours = duration // 60
            minutes = duration % 60
            if hours > 0:
                lines.append(f"⏱️ Duration: {hours}h {minutes}m")
            else:
                lines.append(f"⏱️ Duration: {minutes}m")
        
        if started_at:
            lines.append(f"🕐 Started: {started_at}")
    
    elif 'startSession' in operation.lower() or 'session' in operation.lower():
        skill_name = data.get('skill', {}).get('name', 'Unknown')
        activity_name = data.get('name', 'Session')
        lines.append(f"🚀 Started: {activity_name}")
        lines.append(f"📚 Skill: {skill_name}")
        if data.get('startedAt'):
            lines.append(f"⏰ Started at: {data['startedAt']}")
    
    elif 'stats' in operation.lower():
        total_hours = data.get('totalHours', 0)
        total_activities = data.get('totalActivities', 0)
        lines.append(f"📊 Statistics")
        lines.append(f"⏱️ Total hours: {total_hours:.1f}")
        lines.append(f"📝 Activities: {total_activities}")
        
        breakdown = data.get('skillBreakdown', [])
        if breakdown:
            lines.append("\n🎯 By skill:")
            for skill_stat in breakdown[:5]:  # Top 5
                name = skill_stat.get('skillName', 'Unknown')
                hours = skill_stat.get('totalHours', 0)
                lines.append(f"  • {name}: {hours:.1f}h")
    
    elif 'event' in operation.lower():
        title = data.get('title', 'Event')
        start_time = data.get('startTime', '')
        lines.append(f"📅 {title}")
        if start_time:
            lines.append(f"🕐 {start_time}")
    
    elif 'skill' in operation.lower():
        name = data.get('name', 'Skill')
        level = data.get('level', '')
        lines.append(f"🎯 {name}")
        if level:
            lines.append(f"Level: {level}")
    
    elif 'note' in operation.lower():
        title = data.get('title', 'Note')
        tags = data.get('tags', [])
        lines.append(f"📝 {title}")
        if tags:
            lines.append(f"Tags: {', '.join(tags)}")
    
    else:
        # Generic formatting
        for key, value in data.items():
            if key not in ['id', '__typename'] and value is not None:
                lines.append(f"{key}: {value}")
    
    return '\n'.join(lines) if lines else "✅ Done!"


def _format_list_response(data: list, operation: str) -> str:
    """Format a list response"""
    if not data:
        return "No results found."
    
    lines = [f"Found {len(data)} results:\n"]
    
    for i, item in enumerate(data[:10], 1):  # Limit to 10 items
        if isinstance(item, dict):
            # Pick most relevant fields
            name = item.get('name') or item.get('title') or item.get('id', 'Item')
            lines.append(f"{i}. {name}")
        else:
            lines.append(f"{i}. {item}")
    
    if len(data) > 10:
        lines.append(f"\n... and {len(data) - 10} more")
    
    return '\n'.join(lines)
