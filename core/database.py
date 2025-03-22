# core/database.py

import logging
from typing import Dict, Any, Optional, List
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

logger = logging.getLogger(__name__)

class MongoDB:
    """Handles MongoDB connections and operations"""
    
    def __init__(self, config):
        """
        Initialize MongoDB connection
        
        Args:
            config: Application configuration containing MongoDB settings
        """
        self.config = config
        self.client = None
        self.db = None
        
    def connect(self) -> None:
        """Establish connection to MongoDB"""
        try:
            # Build connection string based on configuration
            if hasattr(self.config, 'MONGO_URI') and self.config.MONGO_URI:
                # Use URI if provided
                connection_string = self.config.MONGO_URI
            else:
                # Build connection string from components
                auth_str = ""
                if hasattr(self.config, 'MONGO_USERNAME') and self.config.MONGO_USERNAME:
                    auth_str = f"{self.config.MONGO_USERNAME}:{self.config.MONGO_PASSWORD}@"
                
                host = self.config.MONGO_HOST
                port = self.config.MONGO_PORT
                connection_string = f"mongodb://{auth_str}{host}:{port}/"
            
            # Connect to MongoDB
            self.client = MongoClient(connection_string, serverSelectionTimeoutMS=5000)
            
            # Test connection
            self.client.admin.command('ping')
            
            # Get database
            self.db = self.client[self.config.MONGO_DB]
            
            logger.info(f"Connected to MongoDB: {self.config.MONGO_HOST}:{self.config.MONGO_PORT}")
            
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"MongoDB connection failed: {e}")
            raise
    
    def get_collection(self, collection_name: str) -> Collection:
        """
        Get a MongoDB collection
        
        Args:
            collection_name: Name of the collection
            
        Returns:
            MongoDB collection
        """
        # Fix: Don't check for truth value on self.db
        if self.db is None:
            self.connect()
        return self.db[collection_name]
    
    def insert_one(self, collection_name: str, document: Dict[str, Any]) -> str:
        """
        Insert a document into a collection
        
        Args:
            collection_name: Name of the collection
            document: Document to insert
            
        Returns:
            ID of the inserted document
        """
        collection = self.get_collection(collection_name)
        result = collection.insert_one(document)
        return str(result.inserted_id)
    
    def insert_many(self, collection_name: str, documents: List[Dict[str, Any]]) -> List[str]:
        """
        Insert multiple documents into a collection
        
        Args:
            collection_name: Name of the collection
            documents: List of documents to insert
            
        Returns:
            List of inserted document IDs
        """
        collection = self.get_collection(collection_name)
        result = collection.insert_many(documents)
        return [str(id) for id in result.inserted_ids]
    
    def find_one(self, collection_name: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Find a single document
        
        Args:
            collection_name: Name of the collection
            query: Query to filter documents
            
        Returns:
            Matching document or None
        """
        collection = self.get_collection(collection_name)
        return collection.find_one(query)
    
    def find(self, 
            collection_name: str, 
            query: Dict[str, Any], 
            projection: Optional[Dict[str, Any]] = None, 
            sort: Optional[List[tuple]] = None,
            limit: int = 0,
            skip: int = 0) -> List[Dict[str, Any]]:
        """
        Find multiple documents
        
        Args:
            collection_name: Name of the collection
            query: Query to filter documents
            projection: Fields to include or exclude
            sort: List of (key, direction) tuples for sorting
            limit: Maximum number of documents to return (0 = no limit)
            skip: Number of documents to skip
            
        Returns:
            List of matching documents
        """
        collection = self.get_collection(collection_name)
        cursor = collection.find(query, projection)
        
        if sort:
            cursor = cursor.sort(sort)
        
        if skip:
            cursor = cursor.skip(skip)
            
        if limit:
            cursor = cursor.limit(limit)
            
        return list(cursor)
    
    def update_one(self, 
                  collection_name: str, 
                  query: Dict[str, Any], 
                  update: Dict[str, Any],
                  upsert: bool = False) -> int:
        """
        Update a single document
        
        Args:
            collection_name: Name of the collection
            query: Query to filter documents
            update: Update operations to apply
            upsert: Whether to insert if no document matches
            
        Returns:
            Number of documents modified
        """
        collection = self.get_collection(collection_name)
        result = collection.update_one(query, update, upsert=upsert)
        return result.modified_count
    
    def update_many(self, 
                   collection_name: str, 
                   query: Dict[str, Any], 
                   update: Dict[str, Any],
                   upsert: bool = False) -> int:
        """
        Update multiple documents
        
        Args:
            collection_name: Name of the collection
            query: Query to filter documents
            update: Update operations to apply
            upsert: Whether to insert if no document matches
            
        Returns:
            Number of documents modified
        """
        collection = self.get_collection(collection_name)
        result = collection.update_many(query, update, upsert=upsert)
        return result.modified_count
    
    def delete_one(self, collection_name: str, query: Dict[str, Any]) -> int:
        """
        Delete a single document
        
        Args:
            collection_name: Name of the collection
            query: Query to filter documents
            
        Returns:
            Number of documents deleted
        """
        collection = self.get_collection(collection_name)
        result = collection.delete_one(query)
        return result.deleted_count
    
    def delete_many(self, collection_name: str, query: Dict[str, Any]) -> int:
        """
        Delete multiple documents
        
        Args:
            collection_name: Name of the collection
            query: Query to filter documents
            
        Returns:
            Number of documents deleted
        """
        collection = self.get_collection(collection_name)
        result = collection.delete_many(query)
        return result.deleted_count
    
    def create_index(self, collection_name: str, keys: List[tuple], **kwargs) -> str:
        """
        Create an index on a collection
        
        Args:
            collection_name: Name of the collection
            keys: List of (key, direction) tuples
            **kwargs: Additional index options
            
        Returns:
            Name of the created index
        """
        collection = self.get_collection(collection_name)
        return collection.create_index(keys, **kwargs)
    
    def close(self) -> None:
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")