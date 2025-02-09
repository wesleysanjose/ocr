from datetime import datetime
import os
from pathlib import Path

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
        import shutil
        shutil.rmtree(directory)