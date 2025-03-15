from typing import Dict, Any
from .document_storage import DocumentStorage, LocalFileStorage, S3Storage

class StorageFactory:
    """Factory class to create appropriate storage backends"""
    
    @staticmethod
    def create_storage(config: Dict[str, Any]) -> DocumentStorage:
        """Create a storage backend based on configuration"""
        storage_type = config.get("type", "local").lower()
        
        if storage_type == "local":
            base_path = config.get("base_path", "/tmp/ocr_documents")
            return LocalFileStorage(base_path)
        
        elif storage_type == "s3":
            bucket_name = config.get("bucket_name")
            if not bucket_name:
                raise ValueError("S3 storage requires a bucket_name")
                
            aws_access_key = config.get("aws_access_key")
            aws_secret_key = config.get("aws_secret_key")
            region = config.get("region")
            
            return S3Storage(bucket_name, aws_access_key, aws_secret_key, region)
        
        else:
            raise ValueError(f"Unsupported storage type: {storage_type}")