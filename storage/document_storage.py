from abc import ABC, abstractmethod
from pathlib import Path
import os
import shutil
import uuid
import boto3
from botocore.exceptions import ClientError
from typing import Optional, BinaryIO, Dict, Any

class DocumentStorage(ABC):
    """Abstract base class for document storage"""
    
    @abstractmethod
    def store_document(self, file_obj: BinaryIO, document_id: str, metadata: Dict[str, Any]) -> str:
        """Store a document and return its storage ID"""
        pass
    
    @abstractmethod
    def get_document(self, document_id: str) -> Optional[BinaryIO]:
        """Retrieve a document by its ID"""
        pass
    
    @abstractmethod
    def delete_document(self, document_id: str) -> bool:
        """Delete a document by its ID"""
        pass

class LocalFileStorage(DocumentStorage):
    """Local file system implementation of document storage"""
    
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        os.makedirs(self.base_path, exist_ok=True)
    
    def store_document(self, file_obj: BinaryIO, document_id: str, metadata: Dict[str, Any]) -> str:
        """Store a document in the local file system"""
        # Create directory structure based on first chars of document_id
        dir_path = self.base_path / document_id[:2] / document_id[2:4]
        os.makedirs(dir_path, exist_ok=True)
        
        file_path = dir_path / document_id
        
        with open(file_path, 'wb') as f:
            shutil.copyfileobj(file_obj, f)
        
        # Store metadata in a separate file
        with open(f"{file_path}.meta", 'w') as f:
            import json
            json.dump(metadata, f)
        
        return str(file_path)
    
    def get_document(self, document_id: str) -> Optional[BinaryIO]:
        """Retrieve a document from the local file system"""
        file_path = self.base_path / document_id[:2] / document_id[2:4] / document_id
        
        if not file_path.exists():
            return None
        
        return open(file_path, 'rb')
    
    def delete_document(self, document_id: str) -> bool:
        """Delete a document from the local file system"""
        file_path = self.base_path / document_id[:2] / document_id[2:4] / document_id
        meta_path = Path(f"{file_path}.meta")
        
        if not file_path.exists():
            return False
        
        try:
            os.remove(file_path)
            if meta_path.exists():
                os.remove(meta_path)
            return True
        except Exception:
            return False

class S3Storage(DocumentStorage):
    """S3 implementation of document storage"""
    
    def __init__(self, bucket_name: str, aws_access_key: str = None, aws_secret_key: str = None, region: str = None):
        self.bucket_name = bucket_name
        
        # Initialize S3 client
        session = boto3.Session(
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
            region_name=region
        )
        self.s3 = session.client('s3')
        
        # Ensure bucket exists
        try:
            self.s3.head_bucket(Bucket=bucket_name)
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                self.s3.create_bucket(Bucket=bucket_name)
            else:
                raise
    
    def store_document(self, file_obj: BinaryIO, document_id: str, metadata: Dict[str, Any]) -> str:
        """Store a document in S3"""
        key = f"documents/{document_id[:2]}/{document_id[2:4]}/{document_id}"
        
        # Upload the file
        self.s3.upload_fileobj(
            file_obj, 
            self.bucket_name, 
            key,
            ExtraArgs={"Metadata": {k: str(v) for k, v in metadata.items()}}
        )
        
        return f"s3://{self.bucket_name}/{key}"
    
    def get_document(self, document_id: str) -> Optional[BinaryIO]:
        """Retrieve a document from S3"""
        key = f"documents/{document_id[:2]}/{document_id[2:4]}/{document_id}"
        
        try:
            response = self.s3.get_object(Bucket=self.bucket_name, Key=key)
            return response['Body']
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                return None
            raise
    
    def delete_document(self, document_id: str) -> bool:
        """Delete a document from S3"""
        key = f"documents/{document_id[:2]}/{document_id[2:4]}/{document_id}"
        
        try:
            self.s3.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError:
            return False