# core/storage/interface.py

from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO, List, Dict, Optional, Union


class StorageProvider(ABC):
    """Abstract interface for storage providers (local filesystem, S3, etc.)"""
    
    @abstractmethod
    def initialize(self) -> None:
        """Initialize the storage provider"""
        pass
    
    @abstractmethod
    def save_file(self, file_stream: BinaryIO, relative_path: str, content_type: Optional[str] = None) -> str:
        """
        Save a file to storage
        
        Args:
            file_stream: File-like object to read from
            relative_path: Path relative to storage root
            content_type: MIME type of the file (optional)
            
        Returns:
            URI/path to the saved file
        """
        pass
    
    @abstractmethod
    def get_file(self, file_path: str) -> BinaryIO:
        """
        Retrieve a file from storage
        
        Args:
            file_path: Path to the file
            
        Returns:
            File-like object
        """
        pass
    
    @abstractmethod
    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from storage
        
        Args:
            file_path: Path to the file
            
        Returns:
            True if successful, False otherwise
        """
        pass
    
    @abstractmethod
    def list_files(self, directory_path: str) -> List[str]:
        """
        List files in a directory
        
        Args:
            directory_path: Path to the directory
            
        Returns:
            List of file paths
        """
        pass
    
    @abstractmethod
    def create_directory(self, directory_path: str) -> str:
        """
        Create a directory in storage
        
        Args:
            directory_path: Path to the directory
            
        Returns:
            Path to the created directory
        """
        pass
    
    @abstractmethod
    def get_file_metadata(self, file_path: str) -> Dict:
        """
        Get metadata for a file
        
        Args:
            file_path: Path to the file
            
        Returns:
            Dictionary of metadata
        """
        pass
    
    @abstractmethod
    def generate_presigned_url(self, file_path: str, expiration: int = 3600) -> str:
        """
        Generate a presigned URL for file access
        
        Args:
            file_path: Path to the file
            expiration: URL expiration time in seconds
            
        Returns:
            Presigned URL
        """
        pass