# core/storage/s3_storage.py

import logging
import mimetypes
from io import BytesIO
from typing import BinaryIO, List, Dict, Optional, Union
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

from .interface import StorageProvider

logger = logging.getLogger(__name__)

class S3StorageProvider(StorageProvider):
    """AWS S3 storage provider implementation"""
    
    def __init__(self, config):
        """
        Initialize the S3 storage provider
        
        Args:
            config: Application configuration containing S3 settings
        """
        self.config = config
        self.bucket_name = config.S3_BUCKET_NAME
        self.region = config.AWS_REGION
        self.s3_client = None
        self.s3_resource = None
        
    def initialize(self) -> None:
        """Initialize the S3 client and ensure bucket exists"""
        try:
            # Initialize S3 client
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=self.config.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=self.config.AWS_SECRET_ACCESS_KEY,
                region_name=self.region
            )
            
            # Initialize S3 resource for higher-level operations
            self.s3_resource = boto3.resource(
                's3',
                aws_access_key_id=self.config.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=self.config.AWS_SECRET_ACCESS_KEY,
                region_name=self.region
            )
            
            # Check if bucket exists
            try:
                self.s3_client.head_bucket(Bucket=self.bucket_name)
                logger.info(f"S3 bucket {self.bucket_name} exists")
            except ClientError as e:
                error_code = e.response['Error']['Code']
                if error_code == '404':
                    # Bucket doesn't exist, create it
                    logger.info(f"Creating S3 bucket {self.bucket_name}")
                    location = {'LocationConstraint': self.region}
                    self.s3_client.create_bucket(
                        Bucket=self.bucket_name,
                        CreateBucketConfiguration=location
                    )
                else:
                    logger.error(f"S3 bucket error: {e}")
                    raise
                    
            # Create basic tenant structure
            self.create_directory('tenants')
            logger.info(f"S3 storage provider initialized for bucket {self.bucket_name}")
        except Exception as e:
            logger.error(f"Failed to initialize S3 storage: {e}")
            raise
    
    def save_file(self, file_stream: BinaryIO, relative_path: str, 
                 content_type: Optional[str] = None) -> str:
        """
        Save a file to S3 storage
        
        Args:
            file_stream: File-like object to read from
            relative_path: Path relative to bucket root
            content_type: MIME type of the file (optional)
            
        Returns:
            S3 key of the saved file
        """
        try:
            # If content_type is not provided, try to determine it
            if not content_type:
                content_type, _ = mimetypes.guess_type(relative_path)
                
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            # Upload the file to S3
            self.s3_client.upload_fileobj(
                file_stream, 
                self.bucket_name, 
                relative_path,
                ExtraArgs=extra_args
            )
            
            logger.info(f"File uploaded to S3: {relative_path}")
            return relative_path
        except Exception as e:
            logger.error(f"Failed to upload file to S3 {relative_path}: {e}")
            raise
    
    def get_file(self, file_path: str) -> BinaryIO:
        """
        Retrieve a file from S3
        
        Args:
            file_path: S3 key of the file
            
        Returns:
            File-like object
        """
        try:
            file_obj = BytesIO()
            self.s3_client.download_fileobj(
                self.bucket_name,
                file_path,
                file_obj
            )
            file_obj.seek(0)  # Rewind to the beginning of the file
            
            return file_obj
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                raise FileNotFoundError(f"File not found in S3: {file_path}")
            logger.error(f"Failed to download file from S3 {file_path}: {e}")
            raise
    
    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from S3
        
        Args:
            file_path: S3 key of the file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=file_path
            )
            logger.info(f"File deleted from S3: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete file from S3 {file_path}: {e}")
            return False
    
    def list_files(self, directory_path: str) -> List[str]:
        """
        List files in a directory in S3
        
        Args:
            directory_path: Directory path/prefix in S3
            
        Returns:
            List of S3 keys
        """
        try:
            # Ensure directory path ends with '/'
            if directory_path and not directory_path.endswith('/'):
                directory_path += '/'
                
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=directory_path,
                Delimiter='/'
            )
            
            files = []
            
            # Get objects (files)
            if 'Contents' in response:
                for obj in response['Contents']:
                    # Skip the directory itself
                    if obj['Key'] != directory_path:
                        files.append(obj['Key'])
            
            return files
        except Exception as e:
            logger.error(f"Failed to list files in S3 directory {directory_path}: {e}")
            return []
    
    def create_directory(self, directory_path: str) -> str:
        """
        Create a "directory" in S3 (S3 doesn't have real directories, just objects with prefixes)
        
        Args:
            directory_path: Directory path/prefix to create
            
        Returns:
            Created directory path
        """
        try:
            # Ensure directory path ends with '/'
            if not directory_path.endswith('/'):
                directory_path += '/'
                
            # Create an empty object with the directory name as key
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=directory_path,
                Body=''
            )
            
            logger.info(f"S3 directory created: {directory_path}")
            return directory_path
        except Exception as e:
            logger.error(f"Failed to create S3 directory {directory_path}: {e}")
            raise
    
    def get_file_metadata(self, file_path: str) -> Dict:
        """
        Get metadata for a file in S3
        
        Args:
            file_path: S3 key of the file
            
        Returns:
            Dictionary of metadata
        """
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=file_path
            )
            
            return {
                'size': response['ContentLength'],
                'created': response.get('LastModified'),  # S3 doesn't track creation time
                'modified': response.get('LastModified'),
                'content_type': response.get('ContentType', 'application/octet-stream'),
                'path': file_path,
                'is_directory': file_path.endswith('/'),
                'etag': response.get('ETag'),
                'metadata': response.get('Metadata', {})
            }
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                raise FileNotFoundError(f"File not found in S3: {file_path}")
            logger.error(f"Failed to get metadata for S3 file {file_path}: {e}")
            raise
    
    def generate_presigned_url(self, file_path: str, expiration: int = 3600) -> str:
        """
        Generate a presigned URL for file access
        
        Args:
            file_path: S3 key of the file
            expiration: URL expiration time in seconds
            
        Returns:
            Presigned URL
        """
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': file_path
                },
                ExpiresIn=expiration
            )
            
            return url
        except Exception as e:
            logger.error(f"Failed to generate presigned URL for {file_path}: {e}")
            raise