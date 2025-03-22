# models/user.py

import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
import uuid
import hashlib
import os

from bson.objectid import ObjectId

logger = logging.getLogger(__name__)

class User:
    """MongoDB model for user data"""
    
    collection_name = "users"
    
    def __init__(self, db):
        """
        Initialize User model
        
        Args:
            db: MongoDB instance
        """
        self.db = db
        self.collection = db.get_collection(self.collection_name)
    
    def create(self, 
              username: str,
              email: str,
              password: str,
              tenant_id: str,
              full_name: Optional[str] = None,
              role: str = "user",
              settings: Optional[Dict[str, Any]] = None) -> str:
        """
        Create a new user
        
        Args:
            username: Username
            email: Email address
            password: Plain text password (will be hashed)
            tenant_id: Tenant ID
            full_name: User's full name
            role: User role ("admin", "user", etc.)
            settings: User-specific settings
            
        Returns:
            User ID
        """
        now = datetime.utcnow()
        
        # Hash password
        password_salt = os.urandom(32).hex()
        password_hash = self._hash_password(password, password_salt)
        
        user_doc = {
            "username": username,
            "email": email.lower(),
            "password_hash": password_hash,
            "password_salt": password_salt,
            "tenant_id": tenant_id,
            "full_name": full_name,
            "role": role,
            "settings": settings or {},
            "last_login": None,
            "status": "active",
            "created_at": now,
            "updated_at": now,
            "deleted": False
        }
        
        try:
            # Check if user with email or username already exists
            existing_user = self.db.find_one(self.collection_name, {
                "$or": [
                    {"email": email.lower()},
                    {"username": username}
                ],
                "deleted": False
            })
            
            if existing_user:
                raise ValueError("User with this email or username already exists")
            
            user_id = self.db.insert_one(self.collection_name, user_doc)
            logger.info(f"Created user: {user_id}, username: {username}")
            return user_id
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            raise
    
    def _hash_password(self, password: str, salt: str) -> str:
        """
        Hash password with salt using SHA-256
        
        Args:
            password: Plain text password
            salt: Password salt
            
        Returns:
            Hashed password
        """
        pw_hash = hashlib.sha256()
        pw_hash.update((password + salt).encode('utf-8'))
        return pw_hash.hexdigest()
    
    def authenticate(self, username_or_email: str, password: str) -> Optional[Dict]:
        """
        Authenticate a user
        
        Args:
            username_or_email: Username or email
            password: Plain text password
            
        Returns:
            User document if authenticated, None otherwise
        """
        try:
            # Check if input is email or username
            query = {
                "$or": [
                    {"email": username_or_email.lower()},
                    {"username": username_or_email}
                ],
                "status": "active",
                "deleted": False
            }
            
            user = self.db.find_one(self.collection_name, query)
            
            if not user:
                return None
                
            # Verify password
            password_hash = self._hash_password(password, user["password_salt"])
            
            if password_hash != user["password_hash"]:
                return None
                
            # Update last login time
            self.db.update_one(
                self.collection_name,
                {"_id": user["_id"]},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            
            # Don't return sensitive data
            user.pop("password_hash", None)
            user.pop("password_salt", None)
            
            # Add ID field
            user["id"] = str(user["_id"])
            
            return user
            
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return None
    
    def get(self, user_id: str, tenant_id: Optional[str] = None) -> Optional[Dict]:
        """
        Get a user by ID
        
        Args:
            user_id: User ID
            tenant_id: Optional tenant ID for validation
            
        Returns:
            User document or None
        """
        try:
            query = {
                "_id": ObjectId(user_id),
                "deleted": False
            }
            
            if tenant_id:
                query["tenant_id"] = tenant_id
                
            user = self.db.find_one(self.collection_name, query)
            
            if user:
                # Don't return sensitive data
                user.pop("password_hash", None)
                user.pop("password_salt", None)
                
                # Add ID field
                user["id"] = str(user["_id"])
                
            return user
        except Exception as e:
            logger.error(f"Failed to get user {user_id}: {e}")
            raise
    
    def get_by_username(self, username: str, tenant_id: Optional[str] = None) -> Optional[Dict]:
        """
        Get a user by username
        
        Args:
            username: Username
            tenant_id: Optional tenant ID for validation
            
        Returns:
            User document or None
        """
        try:
            query = {
                "username": username,
                "deleted": False
            }
            
            if tenant_id:
                query["tenant_id"] = tenant_id
                
            user = self.db.find_one(self.collection_name, query)
            
            if user:
                # Don't return sensitive data
                user.pop("password_hash", None)
                user.pop("password_salt", None)
                
                # Add ID field
                user["id"] = str(user["_id"])
                
            return user
        except Exception as e:
            logger.error(f"Failed to get user by username {username}: {e}")
            raise
    
    def list(self, 
            tenant_id: Optional[str] = None,
            role: Optional[str] = None,
            status: Optional[str] = None,
            limit: int = 50,
            skip: int = 0) -> List[Dict]:
        """
        List users
        
        Args:
            tenant_id: Optional tenant ID filter
            role: Optional role filter
            status: Optional status filter
            limit: Maximum number of users to return
            skip: Number of users to skip
            
        Returns:
            List of user documents
        """
        try:
            query = {"deleted": False}
            
            if tenant_id:
                query["tenant_id"] = tenant_id
                
            if role:
                query["role"] = role
                
            if status:
                query["status"] = status
            
            sort_settings = [("username", 1)]
            
            users = self.db.find(
                self.collection_name,
                query,
                sort=sort_settings,
                limit=limit,
                skip=skip
            )
            
            # Process user documents
            result = []
            for user in users:
                # Don't return sensitive data
                user.pop("password_hash", None)
                user.pop("password_salt", None)
                
                # Add ID field
                user["id"] = str(user["_id"])
                result.append(user)
                
            logger.info(f"Found {len(result)} users")
            return result
            
        except Exception as e:
            logger.error(f"Failed to list users: {e}")
            raise
    
    def update(self, 
              user_id: str, 
              updates: Dict[str, Any],
              tenant_id: Optional[str] = None) -> bool:
        """
        Update a user
        
        Args:
            user_id: User ID
            updates: Dictionary of updates to apply
            tenant_id: Optional tenant ID for validation
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {
                "_id": ObjectId(user_id),
                "deleted": False
            }
            
            if tenant_id:
                query["tenant_id"] = tenant_id
            
            # Don't allow updating certain fields
            for field in ["_id", "password_hash", "password_salt", "created_at", "deleted"]:
                if field in updates:
                    del updates[field]
            
            # Handle password update
            if "password" in updates:
                password = updates.pop("password")
                password_salt = os.urandom(32).hex()
                updates["password_hash"] = self._hash_password(password, password_salt)
                updates["password_salt"] = password_salt
            
            # Add updated timestamp
            updates["updated_at"] = datetime.utcnow()
            
            update_operation = {"$set": updates}
            
            modified = self.db.update_one(self.collection_name, query, update_operation)
            
            success = modified > 0
            logger.info(f"Updated user {user_id}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to update user {user_id}: {e}")
            raise
    
    def change_password(self, 
                      user_id: str, 
                      current_password: str, 
                      new_password: str,
                      tenant_id: Optional[str] = None) -> bool:
        """
        Change user password
        
        Args:
            user_id: User ID
            current_password: Current password
            new_password: New password
            tenant_id: Optional tenant ID for validation
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {
                "_id": ObjectId(user_id),
                "deleted": False
            }
            
            if tenant_id:
                query["tenant_id"] = tenant_id
                
            user = self.db.find_one(self.collection_name, query)
            
            if not user:
                return False
                
            # Verify current password
            current_hash = self._hash_password(current_password, user["password_salt"])
            
            if current_hash != user["password_hash"]:
                return False
                
            # Update to new password
            password_salt = os.urandom(32).hex()
            password_hash = self._hash_password(new_password, password_salt)
            
            update_operation = {
                "$set": {
                    "password_hash": password_hash,
                    "password_salt": password_salt,
                    "updated_at": datetime.utcnow()
                }
            }
            
            modified = self.db.update_one(self.collection_name, query, update_operation)
            
            success = modified > 0
            logger.info(f"Changed password for user {user_id}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to change password for user {user_id}: {e}")
            raise
    
    def delete(self, user_id: str, tenant_id: Optional[str] = None) -> bool:
        """
        Soft delete a user
        
        Args:
            user_id: User ID
            tenant_id: Optional tenant ID for validation
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {"_id": ObjectId(user_id)}
            
            if tenant_id:
                query["tenant_id"] = tenant_id
            
            update_operation = {
                "$set": {
                    "deleted": True,
                    "status": "inactive",
                    "updated_at": datetime.utcnow()
                }
            }
            
            modified = self.db.update_one(self.collection_name, query, update_operation)
            
            success = modified > 0
            logger.info(f"Deleted user {user_id}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to delete user {user_id}: {e}")
            raise