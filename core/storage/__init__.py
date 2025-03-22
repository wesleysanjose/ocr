# core/storage/__init__.py

from typing import Dict, Type
import logging

from .interface import StorageProvider
from .local_storage import LocalStorageProvider
from .s3_storage import S3StorageProvider

logger = logging.getLogger(__name__)

class StorageFactory:
    """Factory for creating storage provider instances"""
    
    _providers: Dict[str, Type[StorageProvider]] = {
        'local': LocalStorageProvider,
        's3': S3StorageProvider
    }
    
    @classmethod
    def get_provider(cls, provider_name: str, config) -> StorageProvider:
        """
        Get a storage provider instance
        
        Args:
            provider_name: Name of the provider ('local' or 's3')
            config: Application configuration
            
        Returns:
            StorageProvider instance
        """
        provider_class = cls._providers.get(provider_name.lower())
        
        if not provider_class:
            raise ValueError(f"Unknown storage provider: {provider_name}")
        
        logger.info(f"Initializing {provider_name} storage provider")
        provider = provider_class(config)
        provider.initialize()
        return provider
    
    @classmethod
    def register_provider(cls, name: str, provider_class: Type[StorageProvider]) -> None:
        """
        Register a new storage provider
        
        Args:
            name: Provider name
            provider_class: StorageProvider implementation class
        """
        cls._providers[name.lower()] = provider_class
        logger.info(f"Registered storage provider: {name}")
    
    @classmethod
    def get_available_providers(cls) -> list:
        """
        Get list of available storage providers
        
        Returns:
            List of provider names
        """
        return list(cls._providers.keys())