# models/case.py

import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
import uuid

from bson.objectid import ObjectId

logger = logging.getLogger(__name__)

class Case:
    """MongoDB model for a forensic case"""
    
    collection_name = "cases"
    
    def __init__(self, db):
        """
        Initialize Case model
        
        Args:
            db: MongoDB instance
        """
        self.db = db
        self.collection = db.get_collection(self.collection_name)
    
    def create(self, 
              tenant_id: str, 
              case_number: str, 
              title: str, 
              description: Optional[str] = None,
              tags: Optional[List[str]] = None,
              status: str = "open",
              created_by: Optional[str] = None) -> str:
        """
        Create a new case
        
        Args:
            tenant_id: Tenant/client ID
            case_number: Unique case number (may be auto-generated)
            title: Case title
            description: Case description
            tags: List of tags
            status: Case status
            created_by: User ID who created the case
            
        Returns:
            Case ID
        """
        now = datetime.utcnow()
        
        case_doc = {
            "tenant_id": tenant_id,
            "case_number": case_number,
            "title": title,
            "description": description,
            "tags": tags or [],
            "status": status,
            "documents": [],
            "reports": [],
            "notes": [],
            "created_by": created_by,
            "created_at": now,
            "updated_at": now,
            "deleted": False
        }
        
        try:
            case_id = self.db.insert_one(self.collection_name, case_doc)
            logger.info(f"Created case: {case_id}, case number: {case_number}")
            return case_id
        except Exception as e:
            logger.error(f"Failed to create case: {e}")
            raise
    
    def get(self, case_id: str, tenant_id: str) -> Optional[Dict]:
        """
        Get a case by ID
        
        Args:
            case_id: Case ID
            tenant_id: Tenant ID for validation
            
        Returns:
            Case document or None
        """
        try:
            query = {
                "_id": ObjectId(case_id),
                "tenant_id": tenant_id,
                "deleted": False
            }
            case = self.db.find_one(self.collection_name, query)
            if case:
                case["id"] = str(case["_id"])
            return case
        except Exception as e:
            logger.error(f"Failed to get case {case_id}: {e}")
            raise
    
    def list(self, 
            tenant_id: str, 
            status: Optional[str] = None, 
            tags: Optional[List[str]] = None,
            search: Optional[str] = None,
            limit: int = 50,
            skip: int = 0,
            sort_by: str = "created_at",
            sort_dir: int = -1) -> List[Dict]:
        """
        List cases for a tenant
        
        Args:
            tenant_id: Tenant ID
            status: Filter by status
            tags: Filter by tags
            search: Search text in title and description
            limit: Maximum number of cases to return
            skip: Number of cases to skip
            sort_by: Field to sort by
            sort_dir: Sort direction (1=ascending, -1=descending)
            
        Returns:
            List of case documents
        """
        try:
            # Build query
            query = {
                "tenant_id": tenant_id,
                "deleted": False
            }
            
            if status:
                query["status"] = status
                
            if tags:
                query["tags"] = {"$all": tags}
                
            if search:
                query["$or"] = [
                    {"title": {"$regex": search, "$options": "i"}},
                    {"description": {"$regex": search, "$options": "i"}},
                    {"case_number": {"$regex": search, "$options": "i"}}
                ]
            
            # Sort settings
            sort_settings = [(sort_by, sort_dir)]
            
            cases = self.db.find(
                self.collection_name,
                query,
                sort=sort_settings,
                limit=limit,
                skip=skip
            )
            
            # Add ID field and remove sensitive data
            for case in cases:
                case["id"] = str(case["_id"])
                
            logger.info(f"Found {len(cases)} cases for tenant {tenant_id}")
            return cases
            
        except Exception as e:
            logger.error(f"Failed to list cases: {e}")
            raise
    
    def update(self, 
              case_id: str, 
              tenant_id: str, 
              updates: Dict[str, Any]) -> bool:
        """
        Update a case
        
        Args:
            case_id: Case ID
            tenant_id: Tenant ID for validation
            updates: Dictionary of updates to apply
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {
                "_id": ObjectId(case_id),
                "tenant_id": tenant_id,
                "deleted": False
            }
            
            # Don't allow updating certain fields
            for field in ["_id", "tenant_id", "created_at", "created_by", "deleted"]:
                if field in updates:
                    del updates[field]
            
            # Add updated timestamp
            updates["updated_at"] = datetime.utcnow()
            
            update_operation = {"$set": updates}
            
            modified = self.db.update_one(self.collection_name, query, update_operation)
            
            success = modified > 0
            logger.info(f"Updated case {case_id}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to update case {case_id}: {e}")
            raise
    
    def add_document(self, 
                    case_id: str, 
                    tenant_id: str, 
                    document_id: str,
                    document_metadata: Dict[str, Any]) -> bool:
        """
        Add a document to a case
        
        Args:
            case_id: Case ID
            tenant_id: Tenant ID for validation
            document_id: Document ID
            document_metadata: Document metadata
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {
                "_id": ObjectId(case_id),
                "tenant_id": tenant_id,
                "deleted": False
            }
            
            document_info = {
                "document_id": document_id,
                "added_at": datetime.utcnow(),
                **document_metadata
            }
            
            update_operation = {"$push": {"documents": document_info}}
            
            modified = self.db.update_one(self.collection_name, query, update_operation)
            
            success = modified > 0
            logger.info(f"Added document {document_id} to case {case_id}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to add document to case {case_id}: {e}")
            raise
    
    def add_report(self, 
                  case_id: str, 
                  tenant_id: str, 
                  report_id: str,
                  report_metadata: Dict[str, Any]) -> bool:
        """
        Add a report to a case
        
        Args:
            case_id: Case ID
            tenant_id: Tenant ID for validation
            report_id: Report ID
            report_metadata: Report metadata
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {
                "_id": ObjectId(case_id),
                "tenant_id": tenant_id,
                "deleted": False
            }
            
            report_info = {
                "report_id": report_id,
                "created_at": datetime.utcnow(),
                **report_metadata
            }
            
            update_operation = {"$push": {"reports": report_info}}
            
            modified = self.db.update_one(self.collection_name, query, update_operation)
            
            success = modified > 0
            logger.info(f"Added report {report_id} to case {case_id}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to add report to case {case_id}: {e}")
            raise
    
    def delete(self, case_id: str, tenant_id: str) -> bool:
        """
        Soft delete a case
        
        Args:
            case_id: Case ID
            tenant_id: Tenant ID for validation
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {
                "_id": ObjectId(case_id),
                "tenant_id": tenant_id
            }
            
            update_operation = {
                "$set": {
                    "deleted": True,
                    "updated_at": datetime.utcnow()
                }
            }
            
            modified = self.db.update_one(self.collection_name, query, update_operation)
            
            success = modified > 0
            logger.info(f"Deleted case {case_id}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to delete case {case_id}: {e}")
            raise
    
    def hard_delete(self, case_id: str, tenant_id: str) -> bool:
        """
        Permanently delete a case (use with caution)
        
        Args:
            case_id: Case ID
            tenant_id: Tenant ID for validation
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {
                "_id": ObjectId(case_id),
                "tenant_id": tenant_id
            }
            
            deleted = self.db.delete_one(self.collection_name, query)
            
            success = deleted > 0
            logger.info(f"Hard deleted case {case_id}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to hard delete case {case_id}: {e}")
            raise