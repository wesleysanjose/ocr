# core/storage/local_storage.py

import os
import shutil
import mimetypes
import hashlib
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import BinaryIO, List, Dict, Optional, Union, IO

from .interface import StorageProvider

logger = logging.getLogger(__name__)

class LocalStorageProvider(StorageProvider):
    """Local filesystem storage provider implementation"""
    
    def __init__(self, config):
        """
        Initialize the local storage provider
        
        Args:
            config: Application configuration containing storage settings
        """
        self.config = config
        self.base_dir = Path(config.STORAGE_ROOT_DIR)
        
    def initialize(self) -> None:
        """Initialize the storage provider by creating base directories"""
        try:
            self.base_dir.mkdir(parents=True, exist_ok=True)
            tenant_base = self.base_dir / 'tenants'
            tenant_base.mkdir(exist_ok=True)
            logger.info(f"Local storage initialized at {self.base_dir}")
        except Exception as e:
            logger.error(f"Failed to initialize local storage: {e}")
            raise
    
    def save_file(self, file_stream: BinaryIO, relative_path: str, 
                 content_type: Optional[str] = None) -> str:
        """
        Save a file to local storage
        
        Args:
            file_stream: File-like object to read from
            relative_path: Path relative to storage root
            content_type: MIME type of the file (optional)
            
        Returns:
            Path to the saved file
        """
        try:
            full_path = self.base_dir / relative_path
            
            # Create directory if it doesn't exist
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write the file
            with open(full_path, 'wb') as dest_file:
                shutil.copyfileobj(file_stream, dest_file)
                
            logger.info(f"File saved to {full_path}")
            return str(relative_path)
        except Exception as e:
            logger.error(f"Failed to save file to {relative_path}: {e}")
            raise
    
    def get_file(self, file_path: str) -> IO[bytes]:
        """
        Retrieve a file from local storage
        
        Args:
            file_path: Path to the file
            
        Returns:
            File-like object
        """
        try:
            full_path = self.base_dir / file_path
            if not full_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
                
            return open(full_path, 'rb')
        except Exception as e:
            logger.error(f"Failed to retrieve file {file_path}: {e}")
            raise
    
    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from local storage
        
        Args:
            file_path: Path to the file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            full_path = self.base_dir / file_path
            if not full_path.exists():
                logger.warning(f"File not found for deletion: {file_path}")
                return False
                
            os.remove(full_path)
            logger.info(f"File deleted: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete file {file_path}: {e}")
            return False
    
    def list_files(self, directory_path: str) -> List[str]:
        """
        List files in a directory
        
        Args:
            directory_path: Path to the directory
            
        Returns:
            List of file paths
        """
        try:
            full_path = self.base_dir / directory_path
            if not full_path.exists() or not full_path.is_dir():
                logger.warning(f"Directory not found: {directory_path}")
                return []
                
            return [
                str(Path(directory_path) / f.name) 
                for f in full_path.iterdir() 
                if f.is_file()
            ]
        except Exception as e:
            logger.error(f"Failed to list files in {directory_path}: {e}")
            return []
    
    def create_directory(self, directory_path: str) -> str:
        """
        Create a directory in local storage
        
        Args:
            directory_path: Path to the directory
            
        Returns:
            Path to the created directory
        """
        try:
            full_path = self.base_dir / directory_path
            full_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Directory created: {directory_path}")
            return directory_path
        except Exception as e:
            logger.error(f"Failed to create directory {directory_path}: {e}")
            raise
    
    def get_file_metadata(self, file_path: str) -> Dict:
        """
        Get metadata for a file in local storage
        
        Args:
            file_path: Path to the file
            
        Returns:
            Dictionary of metadata
        """
        try:
            full_path = self.base_dir / file_path
            if not full_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
                
            stat = full_path.stat()
            mime_type, _ = mimetypes.guess_type(str(full_path))
            
            return {
                'size': stat.st_size,
                'created': datetime.fromtimestamp(stat.st_ctime),
                'modified': datetime.fromtimestamp(stat.st_mtime),
                'content_type': mime_type or 'application/octet-stream',
                'path': file_path,
                'is_directory': full_path.is_dir()
            }
        except Exception as e:
            logger.error(f"Failed to get metadata for {file_path}: {e}")
            raise
    
    def generate_presigned_url(self, file_path: str, expiration: int = 3600) -> str:
        """
        Generate a URL for file access (for local storage, just returns the path)
        
        Args:
            file_path: Path to the file
            expiration: URL expiration time in seconds (not used for local storage)
            
        Returns:
            URL for file access
        """
        # For local storage, we can't generate presigned URLs like in S3
        # Instead, return a relative URL for the API to serve the file
        return f"/api/files/{file_path}"