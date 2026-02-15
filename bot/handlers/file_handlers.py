"""
File system handlers for Telegram bot

Provides hybrid cloud/on-premises file storage through Telegram
"""

import logging
import os
import shutil
from pathlib import Path
from datetime import datetime
from typing import Optional
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from config import Config

logger = logging.getLogger(__name__)


async def upload_file_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle file uploads (documents and photos)"""
    user = update.effective_user
    
    # Check authentication
    if not context.user_data.get('auth_token'):
        await update.message.reply_text("🔒 Please login first using /start")
        return
    
    # Get GraphQL client
    gql_client = context.user_data.get('gql_client')
    if not gql_client:
        await update.message.reply_text("❌ Client not initialized. Please restart with /start")
        return
    
    # Determine file type and get file
    file = None
    file_type = None
    mime_type = None
    original_filename = None
    
    if update.message.document:
        file = await update.message.document.get_file()
        file_type = "document"
        mime_type = update.message.document.mime_type or "application/octet-stream"
        original_filename = update.message.document.file_name
    elif update.message.photo:
        # Get highest resolution photo
        file = await update.message.photo[-1].get_file()
        file_type = "photo"
        mime_type = "image/jpeg"
        original_filename = f"photo_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
    
    if not file:
        await update.message.reply_text("❌ No file detected")
        return
    
    # Get or prompt for directory
    directory = context.user_data.get('current_directory', '/')
    
    # Check if user specified directory in caption
    caption = update.message.caption
    if caption and caption.startswith('/'):
        # Caption starts with /, treat as directory path
        directory = caption.strip()
        caption = None
    elif caption and '→' in caption:
        # Format: "directory → description"
        parts = caption.split('→', 1)
        directory = parts[0].strip()
        caption = parts[1].strip() if len(parts) > 1 else None
    
    # Normalize directory path (no trailing slash except for root)
    if not directory.startswith('/'):
        directory = '/' + directory
    # Remove trailing slash (except for root /)
    if directory != '/' and directory.endswith('/'):
        directory = directory.rstrip('/')
    
    try:
        # Download file to temporary location
        temp_dir = Path(Config.FILE_TEMP_PATH)
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        # Use original filename for physical storage (for transparency)
        # If file exists, add timestamp to make it unique
        storage_root = Path(Config.FILE_STORAGE_PATH)
        storage_root.mkdir(parents=True, exist_ok=True)
        
        # Get filename parts
        file_stem = Path(original_filename).stem if original_filename else 'file'
        file_ext = Path(original_filename).suffix if original_filename else ''
        
        # Start with original filename
        physical_filename = original_filename
        target_file_path = storage_root / physical_filename
        
        # If file exists, add timestamp to make unique
        counter = 1
        while target_file_path.exists():
            # Check if it's the same file (by Telegram unique ID in database)
            # If so, reuse it; otherwise create new file with timestamp
            physical_filename = f"{file_stem}_{counter}{file_ext}"
            target_file_path = storage_root / physical_filename
            counter += 1
        
        # Download to temp first
        temp_file_path = temp_dir / physical_filename
        await file.download_to_drive(temp_file_path)
        
        # Move to permanent storage
        shutil.move(str(temp_file_path), str(target_file_path))
        logger.info(f"File saved to storage: {target_file_path}")
        
        file_size = target_file_path.stat().st_size
        
        # Storage path is relative to storage root (for portability)
        storage_path = physical_filename
        
        logger.info(f"File saved to storage: {target_file_path}")
        
        # Create file record in database
        # Note: 'directory' is the LOGICAL path (virtual directory structure)
        # 'storage_path' is the PHYSICAL path (where file actually is on disk)
        # 'filename' is what users see in the UI
        mutation = """
        mutation CreateFile($input: CreateFileInput!) {
            createFile(input: $input) {
                id
                filename
                directory
                originalFilename
                fileSize
                createdAt
            }
        }
        """
        
        # Use original filename for UI, but store physical path separately
        variables = {
            "input": {
                "filename": original_filename,  # Display name in UI
                "directory": directory,  # Logical/virtual directory
                "originalFilename": original_filename,
                "mimeType": mime_type,
                "fileSize": file_size,
                "telegramFileId": file.file_id,
                "telegramFileUniqueId": file.file_unique_id,
                "telegramMessageId": update.message.message_id,
                "storagePath": storage_path,  # Physical location on disk
                "description": caption,
                "tags": []
            }
        }
        
        result = await gql_client.execute(mutation, variables)
        created_file = result.get('createFile')
        
        if created_file:
            # Format file size
            size_kb = file_size / 1024
            size_str = f"{size_kb:.1f} KB" if size_kb < 1024 else f"{size_kb/1024:.1f} MB"
            
            response = f"✅ **File uploaded successfully!**\n\n"
            response += f"📁 Directory: `{directory}`\n"
            response += f"📄 Filename: `{original_filename}`\n"
            response += f"💾 Size: {size_str}\n"
            response += f"🆔 ID: `{created_file['id']}`"
            
            if caption:
                response += f"\n📝 Description: {caption}"
            
            keyboard = [
                [
                    InlineKeyboardButton("📂 View Directory", callback_data=f"files_list:{directory}"),
                    InlineKeyboardButton("🏠 Root", callback_data="files_list:/"),
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(response, reply_markup=reply_markup, parse_mode='Markdown')
            
            logger.info(f"File uploaded and stored: {target_file_path} by user {user.id}")
        else:
            # Clean up file if database creation failed
            try:
                if target_file_path.exists():
                    target_file_path.unlink()
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup file: {cleanup_error}")
            await update.message.reply_text("❌ Failed to create file record")
            
    except Exception as e:
        logger.error(f"File upload error: {e}", exc_info=True)
        # Try to cleanup temp file if it exists
        try:
            if 'temp_file_path' in locals() and temp_file_path.exists():
                temp_file_path.unlink()
            if 'target_file_path' in locals() and target_file_path.exists():
                target_file_path.unlink()
        except Exception as cleanup_error:
            logger.error(f"Failed to cleanup after error: {cleanup_error}")
        await update.message.reply_text(f"❌ Error uploading file: {str(e)}")


async def list_files_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """List files in current or specified directory"""
    user = update.effective_user
    query = update.callback_query
    
    # Check authentication
    auth_token = context.user_data.get('auth_token')
    if not auth_token:
        message = "🔒 Please login first using /start"
        if query:
            await query.answer(message)
        else:
            await update.message.reply_text(message)
        return
    
    # Get GraphQL client
    gql_client = context.user_data.get('gql_client')
    if not gql_client:
        message = "❌ Client not initialized. Please restart with /start"
        if query:
            await query.answer(message)
        else:
            await update.message.reply_text(message)
        return
    
    # Determine directory
    directory = '/'
    if query and query.data.startswith('files_list:'):
        directory = query.data.split(':', 1)[1]
        await query.answer()
    elif context.args:
        directory = ' '.join(context.args)
    else:
        directory = context.user_data.get('current_directory', '/')
    
    # Normalize directory (no trailing slash except for root)
    if not directory.startswith('/'):
        directory = '/' + directory
    # Remove trailing slash (except for root /)
    if directory != '/' and directory.endswith('/'):
        directory = directory.rstrip('/')
    
    try:
        # Query files
        query_str = """
        query Files($filter: FileFilter, $limit: Int, $directory: String!) {
            files(filter: $filter, limit: $limit) {
                nodes {
                    id
                    filename
                    originalFilename
                    fileSize
                    mimeType
                    createdAt
                    description
                }
                totalCount
            }
            directory(path: $directory) {
                subdirectories
                fileCount
            }
        }
        """
        
        variables = {
            "filter": {"directory": directory},
            "limit": 20,
            "directory": directory
        }
        
        result = await gql_client.execute(query_str, variables)
        files_conn = result.get('files', {})
        files = files_conn.get('nodes', [])
        total_count = files_conn.get('totalCount', 0)
        dir_info = result.get('directory', {})
        subdirs = dir_info.get('subdirectories', [])
        
        # Build response
        response = f"📂 **Directory:** `{directory}`\n"
        response += f"📊 Files: {total_count}\n\n"
        
        # Show subdirectories
        if subdirs:
            response += "**📁 Subdirectories:**\n"
            for subdir in subdirs[:10]:
                response += f"  └─ `{subdir}`\n"
            if len(subdirs) > 10:
                response += f"  ... and {len(subdirs) - 10} more\n"
            response += "\n"
        
        # Show files
        if files:
            response += "**📄 Files:**\n"
            for file in files[:10]:
                size_kb = file['fileSize'] / 1024
                size_str = f"{size_kb:.1f}KB" if size_kb < 1024 else f"{size_kb/1024:.1f}MB"
                
                # Truncate filename if too long
                filename = file['originalFilename']
                if len(filename) > 30:
                    filename = filename[:27] + "..."
                
                response += f"  • `{filename}` ({size_str})\n"
            
            if total_count > 10:
                response += f"  ... and {total_count - 10} more files\n"
        else:
            response += "_No files in this directory_\n"
        
        # Create navigation keyboard
        keyboard = []
        
        # Parent directory button
        if directory != '/':
            parent = str(Path(directory).parent)
            if parent == '.':
                parent = '/'
            keyboard.append([
                InlineKeyboardButton("⬆️ Parent Directory", callback_data=f"files_list:{parent}")
            ])
        
        # Subdirectory buttons
        if subdirs:
            for subdir in subdirs[:5]:
                # Build subdirectory path (no trailing slash)
                subdir_path = f"{directory}/{subdir}" if directory != '/' else f"/{subdir}"
                keyboard.append([
                    InlineKeyboardButton(f"📁 {subdir}", callback_data=f"files_list:{subdir_path}")
                ])
        
        # Action buttons
        action_row = []
        if files:
            action_row.append(InlineKeyboardButton("📥 Download", callback_data=f"files_download_menu:{directory}"))
        action_row.append(InlineKeyboardButton("🔄 Refresh", callback_data=f"files_list:{directory}"))
        if action_row:
            keyboard.append(action_row)
        
        keyboard.append([InlineKeyboardButton("🏠 Root", callback_data="files_list:/")])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        # Store current directory
        context.user_data['current_directory'] = directory
        
        # Send or edit message
        if query:
            await query.edit_message_text(response, reply_markup=reply_markup, parse_mode='Markdown')
        else:
            await update.message.reply_text(response, reply_markup=reply_markup, parse_mode='Markdown')
            
    except Exception as e:
        logger.error(f"List files error: {e}", exc_info=True)
        error_msg = f"❌ Error listing files: {str(e)}"
        if query:
            await query.answer(error_msg)
        else:
            await update.message.reply_text(error_msg)


async def download_file_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Download a file by ID or from a menu"""
    query = update.callback_query
    
    if not context.user_data.get('auth_token'):
        await query.answer("🔒 Please login first using /start")
        return
    
    gql_client = context.user_data.get('gql_client')
    if not gql_client:
        await query.answer("❌ Client not initialized")
        return
    
    try:
        if query.data.startswith('files_download_menu:'):
            # Show download menu for directory
            directory = query.data.split(':', 1)[1]
            
            query_str = """
            query Files($filter: FileFilter, $limit: Int) {
                files(filter: $filter, limit: $limit) {
                    nodes {
                        id
                        originalFilename
                        fileSize
                    }
                }
            }
            """
            
            variables = {
                "filter": {"directory": directory},
                "limit": 10
            }
            
            result = await gql_client.execute(query_str, variables)
            files = result.get('files', {}).get('nodes', [])
            
            if not files:
                await query.answer("No files to download")
                return
            
            keyboard = []
            for file in files:
                filename = file['originalFilename']
                if len(filename) > 30:
                    filename = filename[:27] + "..."
                keyboard.append([
                    InlineKeyboardButton(
                        f"📄 {filename}",
                        callback_data=f"files_download:{file['id']}"
                    )
                ])
            
            keyboard.append([
                InlineKeyboardButton("⬅️ Back", callback_data=f"files_list:{directory}")
            ])
            
            await query.edit_message_text(
                f"📥 **Select file to download:**\n\nDirectory: `{directory}`",
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode='Markdown'
            )
            await query.answer()
            
        elif query.data.startswith('files_download:'):
            # Download specific file
            file_id = query.data.split(':', 1)[1]
            await query.answer("⏳ Preparing download...")
            
            # Get file info
            query_str = """
            query File($id: UUID!) {
                file(id: $id) {
                    id
                    originalFilename
                    directory
                    mimeType
                    fileSize
                    telegramFileId
                    description
                }
            }
            """
            
            result = await gql_client.execute(query_str, {"id": file_id})
            file = result.get('file')
            
            if not file:
                await query.message.reply_text("❌ File not found")
                return
            
            telegram_file_id = file.get('telegramFileId')
            
            if telegram_file_id:
                # Re-send the file using Telegram's file_id
                caption = f"📄 {file['originalFilename']}\n"
                if file.get('description'):
                    caption += f"📝 {file['description']}\n"
                caption += f"📂 {file['directory']}"
                
                mime_type = file['mimeType']
                
                if mime_type.startswith('image/'):
                    await query.message.reply_photo(
                        photo=telegram_file_id,
                        caption=caption
                    )
                else:
                    await query.message.reply_document(
                        document=telegram_file_id,
                        caption=caption
                    )
                    
                logger.info(f"File downloaded: {file['id']} by user {update.effective_user.id}")
            else:
                # File not cached in Telegram, need to send from storage
                # This would require implementing file serving through bot
                await query.message.reply_text(
                    "⚠️ File not cached in Telegram. Download from storage not yet implemented."
                )
                
    except Exception as e:
        logger.error(f"Download file error: {e}", exc_info=True)
        await query.answer(f"❌ Error: {str(e)}")


async def files_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Main /files command - show file system overview"""
    if not context.user_data.get('auth_token'):
        await update.message.reply_text("🔒 Please login first using /start")
        return
    
    # Show root directory by default
    context.user_data['current_directory'] = '/'
    await list_files_command(update, context)


async def set_directory_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Set current directory for file uploads"""
    if not context.user_data.get('auth_token'):
        await update.message.reply_text("🔒 Please login first using /start")
        return
    
    if not context.args:
        current_dir = context.user_data.get('current_directory', '/')
        await update.message.reply_text(
            f"📂 **Current upload directory:** `{current_dir}`\n\n"
            f"Usage: `/cd /path/to/directory`\n"
            f"Example: `/cd /documents/work`\n\n"
            f"💡 _This sets where new files will be uploaded. "
            f"Use `/files [directory]` to view files in any directory._",
            parse_mode='Markdown'
        )
        return
    
    directory = ' '.join(context.args)
    
    # Normalize path (no trailing slash except for root)
    if not directory.startswith('/'):
        directory = '/' + directory
    # Remove trailing slash (except for root /)
    if directory != '/' and directory.endswith('/'):
        directory = directory.rstrip('/')
    
    context.user_data['current_directory'] = directory
    
    await update.message.reply_text(
        f"✅ **Upload directory changed to:** `{directory}`\n\n"
        f"📤 Files you upload now will be saved to this directory.\n"
        f"📂 Use `/files {directory}` to view files in this directory.",
        parse_mode='Markdown'
    )
