# utils/helpers.py

from datetime import datetime
import os
import shutil
from pathlib import Path
import uuid
import re

def create_upload_dir(base_dir: Path) -> Path:
    """Create a timestamped upload directory"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
    upload_path = base_dir / timestamp
    upload_path.mkdir(parents=True, exist_ok=True)
    return upload_path

def allowed_file(filename: str, allowed_extensions: set) -> bool:
    """Check if the file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

def cleanup_dir(directory: Path) -> None:
    """Safely remove a directory and its contents"""
    if directory.exists():
        shutil.rmtree(directory)
        
def generate_unique_id(prefix: str = '') -> str:
    """Generate a unique ID with optional prefix"""
    unique_id = str(uuid.uuid4())
    if prefix:
        return f"{prefix}-{unique_id}"
    return unique_id

def sanitize_filename(filename: str) -> str:
    """Sanitize a filename to remove invalid characters"""
    # Replace invalid chars with underscore
    s = re.sub(r'[\\/*?:"<>|]', '_', filename)
    # Remove leading/trailing periods and spaces
    s = s.strip('. ')
    # Replace multiple spaces with single space
    s = re.sub(r'\s+', ' ', s)
    return s

def get_file_extension(filename: str) -> str:
    """Get file extension from filename"""
    if '.' in filename:
        return filename.rsplit('.', 1)[1].lower()
    return ''

def format_file_size(size_bytes: int) -> str:
    """Format file size in human-readable form"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes/1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes/(1024*1024):.1f} MB"
    else:
        return f"{size_bytes/(1024*1024*1024):.1f} GB"

def ensure_dir_exists(directory: Path) -> None:
    """Ensure that a directory exists, create if it doesn't"""
    directory.mkdir(parents=True, exist_ok=True)

def parse_key_value_text(text: str) -> dict:
    """
    Parse text containing key-value pairs
    
    Example formats:
    "Key: Value"
    "Key - Value"
    
    Returns: Dictionary of key-value pairs
    """
    result = {}
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Try various separators
        for separator in [':', '：', '-', '–', '—', '=']:
            if separator in line:
                parts = line.split(separator, 1)
                key = parts[0].strip()
                value = parts[1].strip()
                
                if key and value:
                    result[key] = value
                break
                
    return result

# utils/helpers.py (add this function)

def convert_object_ids(obj):
    """
    Recursively convert ObjectId to string in MongoDB documents
    
    Args:
        obj: MongoDB document or list of documents
        
    Returns:
        Document with ObjectId converted to string
    """
    from bson import ObjectId
    
    if isinstance(obj, list):
        return [convert_object_ids(item) for item in obj]
    elif isinstance(obj, dict):
        for key, value in list(obj.items()):
            if isinstance(value, ObjectId):
                obj['id'] = str(value) if key == '_id' else str(value)
                if key == '_id':
                    del obj[key]
            elif isinstance(value, (dict, list)):
                obj[key] = convert_object_ids(value)
        return obj
    elif isinstance(obj, ObjectId):
        return str(obj)
    else:
        return obj