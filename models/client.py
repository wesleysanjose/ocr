# models/client.py

import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
import uuid

from bson.objectid import ObjectId

logger = logging.getLogger(__name__)

class Client:
    """MongoDB model for client/tenant data"""
    
    collection_name = "clients"
    
    def __init__(self, db):
        """
        Initialize Client model
        
        Args:
            db: MongoDB instance
        """
        self.db = db
        self.collection = db.get_collection(self.collection_name)
    
    def create(self, 
              name: str,
              contact_email: str,
              contact_name: Optional[str] = None,
              contact_phone: Optional[str] = None,
              settings: Optional[Dict[str, Any]] = None,
              created_by: Optional[str] = None) -> str:
        """
        Create a new client/tenant
        
        Args:
            name: Client name
            contact_email: Primary contact email
            contact_name: Primary contact name
            contact_phone: Primary contact phone
            settings: Client-specific settings
            created_by: User ID who created the client
            
        Returns:
            Client ID
        """
        now = datetime.utcnow()
        
        # Generate a unique tenant code
        tenant_code = self._generate_tenant_code(name)
        
        client_doc = {
            "name": name,
            "tenant_code": tenant_code,
            "contact_email": contact_email,
            "contact_name": contact_name,
            "contact_phone": contact_phone,
            "settings": settings or {},
            "status": "active",
            "created_by": created_by,
            "created_at": now,
            "updated_at": now,
            "deleted": False
        }
        
        try:
            client_id = self.db.insert_one(self.collection_name, client_doc)
            logger.info(f"Created client: {client_id}, name: {name}")
            return client_id
        except Exception as e:
            logger.error(f"Failed to create client: {e}")
            raise
    
    def _generate_tenant_code(self, name: str) -> str:
        """
        Generate a unique tenant code based on the client name
        
        Args:
            name: Client name
            
        Returns:
            Tenant code
        """
        # Create base code from name
        code_base = name.lower().replace(' ', '-')
        code_base = ''.join(c for c in code_base if c.isalnum() or c == '-')
        
        # Limit length
        if len(code_base) > 20:
            code_base = code_base[:20]
            
        # Add random suffix to ensure uniqueness
        code = f"{code_base}-{uuid.uuid4().hex[:6]}"
        
        return code
    
    def get(self, client_id: str) -> Optional[Dict]:
        """
        Get a client by ID
        
        Args:
            client_id: Client ID
            
        Returns:
            Client record or None
        """
        try:
            query = {
                "_id": ObjectId(client_id),
                "deleted": False
            }
            client = self.db.find_one(self.collection_name, query)
            if client:
                client["id"] = str(client["_id"])
            return client
        except Exception as e:
            logger.error(f"Failed to get client {client_id}: {e}")
            raise
    
    def get_by_code(self, tenant_code: str) -> Optional[Dict]:
        """
        Get a client by tenant code
        
        Args:
            tenant_code: Tenant code
            
        Returns:
            Client record or None
        """
        try:
            query = {
                "tenant_code": tenant_code,
                "deleted": False
            }
            client = self.db.find_one(self.collection_name, query)
            if client:
                client["id"] = str(client["_id"])
            return client
        except Exception as e:
            logger.error(f"Failed to get client by code {tenant_code}: {e}")
            raise
    
    def list(self, 
            status: Optional[str] = None,
            limit: int = 50,
            skip: int = 0) -> List[Dict]:
        """
        List clients
        
        Args:
            status: Filter by status
            limit: Maximum number of clients to return
            skip: Number of clients to skip
            
        Returns:
            List of client records
        """
        try:
            query = {"deleted": False}
            
            if status:
                query["status"] = status
            
            sort_settings = [("name", 1)]
            
            clients = self.db.find(
                self.collection_name,
                query,
                sort=sort_settings,
                limit=limit,
                skip=skip
            )
            
            # Add ID field
            for client in clients:
                client["id"] = str(client["_id"])
                
            logger.info(f"Found {len(clients)} clients")
            return clients
            
        except Exception as e:
            logger.error(f"Failed to list clients: {e}")
            raise
    
    def update(self, 
              client_id: str, 
              updates: Dict[str, Any]) -> bool:
        """
        Update a client
        
        Args:
            client_id: Client ID
            updates: Dictionary of updates to apply
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {
                "_id": ObjectId(client_id),
                "deleted": False
            }
            
            # Don't allow updating certain fields
            for field in ["_id", "tenant_code", "created_at", "created_by", "deleted"]:
                if field in updates:
                    del updates[field]
            
            # Add updated timestamp
            updates["updated_at"] = datetime.utcnow()
            
            update_operation = {"$set": updates}
            
            modified = self.db.update_one(self.collection_name, query, update_operation)
            
            success = modified > 0
            logger.info(f"Updated client {client_id}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to update client {client_id}: {e}")
            raise
    
    def delete(self, client_id: str) -> bool:
        """
        Soft delete a client
        
        Args:
            client_id: Client ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {"_id": ObjectId(client_id)}
            
            update_operation = {
                "$set": {
                    "deleted": True,
                    "status": "inactive",
                    "updated_at": datetime.utcnow()
                }
            }
            
            modified = self.db.update_one(self.collection_name, query, update_operation)
            
            success = modified > 0
            logger.info(f"Deleted client {client_id}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to delete client {client_id}: {e}")
            raise