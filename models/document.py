# models/document.py

import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
import uuid

from bson.objectid import ObjectId

logger = logging.getLogger(__name__)

class Document:
    """MongoDB model for document metadata"""
    
    collection_name = "documents"
    
    def __init__(self, db):
        """
        Initialize Document model
        
        Args:
            db: MongoDB instance
        """
        self.db = db
        self.collection = db.get_collection(self.collection_name)
    
    def create(self, 
              tenant_id: str,
              case_id: str,
              filename: str,
              document_type: str,
              storage_paths: Dict[str, str],
              page_count: int,
              ocr_status: str = "complete",
              metadata: Optional[Dict[str, Any]] = None,
              created_by: Optional[str] = None) -> str:
        """
        Create a new document record
        
        Args:
            tenant_id: Tenant/client ID
            case_id: Case ID
            filename: Original filename
            document_type: Type of document (pdf, image, etc.)
            storage_paths: Dictionary of storage paths for the document
            page_count: Number of pages
            ocr_status: OCR processing status
            metadata: Additional metadata
            created_by: User ID who uploaded the document
            
        Returns:
            Document ID
        """
        now = datetime.utcnow()
        
        document_doc = {
            "tenant_id": tenant_id,
            "case_id": case_id,
            "filename": filename,
            "document_type": document_type,
            "storage_paths": storage_paths,
            "page_count": page_count,
            "ocr_status": ocr_status,
            "metadata": metadata or {},
            "created_by": created_by,
            "created_at": now,
            "updated_at": now,
            "deleted": False
        }
        
        try:
            document_id = self.db.insert_one(self.collection_name, document_doc)
            logger.info(f"Created document: {document_id}, filename: {filename}")
            return document_id
        except Exception as e:
            logger.error(f"Failed to create document: {e}")
            raise
    
    def get(self, document_id: str, tenant_id: str) -> Optional[Dict]:
        """
        Get a document by ID
        
        Args:
            document_id: Document ID
            tenant_id: Tenant ID for validation
            
        Returns:
            Document record or None
        """
        try:
            query = {
                "_id": ObjectId(document_id),
                "tenant_id": tenant_id,
                "deleted": False
            }
            document = self.db.find_one(self.collection_name, query)
            if document:
                document["id"] = str(document["_id"])
            return document
        except Exception as e:
            logger.error(f"Failed to get document {document_id}: {e}")
            raise
    
    def list_by_case(self, 
                   case_id: str, 
                   tenant_id: str,
                   limit: int = 100,
                   skip: int = 0) -> List[Dict]:
        """
        List documents for a case
        
        Args:
            case_id: Case ID
            tenant_id: Tenant ID for validation
            limit: Maximum number of documents to return
            skip: Number of documents to skip
            
        Returns:
            List of document records
        """
        try:
            query = {
                "case_id": case_id,
                "tenant_id": tenant_id,
                "deleted": False
            }
            
            sort_settings = [("created_at", -1)]
            
            documents = self.db.find(
                self.collection_name,
                query,
                sort=sort_settings,
                limit=limit,
                skip=skip
            )
            
            # Add ID field
            for doc in documents:
                doc["id"] = str(doc["_id"])
                
            logger.info(f"Found {len(documents)} documents for case {case_id}")
            return documents
            
        except Exception as e:
            logger.error(f"Failed to list documents for case {case_id}: {e}")
            raise
    
    def update(self, 
              document_id: str, 
              tenant_id: str, 
              updates: Dict[str, Any]) -> bool:
        """
        Update a document
        
        Args:
            document_id: Document ID
            tenant_id: Tenant ID for validation
            updates: Dictionary of updates to apply
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {
                "_id": ObjectId(document_id),
                "tenant_id": tenant_id,
                "deleted": False
            }
            
            # Don't allow updating certain fields
            for field in ["_id", "tenant_id", "case_id", "created_at", "created_by", "deleted"]:
                if field in updates:
                    del updates[field]
            
            # Add updated timestamp
            updates["updated_at"] = datetime.utcnow()
            
            update_operation = {"$set": updates}
            
            modified = self.db.update_one(self.collection_name, query, update_operation)
            
            success = modified > 0
            logger.info(f"Updated document {document_id}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to update document {document_id}: {e}")
            raise
    
    def update_ocr_status(self, 
                         document_id: str, 
                         tenant_id: str, 
                         ocr_status: str,
                         error_message: Optional[str] = None) -> bool:
        """
        Update OCR status for a document
        
        Args:
            document_id: Document ID
            tenant_id: Tenant ID for validation
            ocr_status: New OCR status
            error_message: Error message if status is 'failed'
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {
                "_id": ObjectId(document_id),
                "tenant_id": tenant_id,
                "deleted": False
            }
            
            updates = {
                "ocr_status": ocr_status,
                "updated_at": datetime.utcnow()
            }
            
            if error_message:
                updates["ocr_error"] = error_message
            
            update_operation = {"$set": updates}
            
            modified = self.db.update_one(self.collection_name, query, update_operation)
            
            success = modified > 0
            logger.info(f"Updated OCR status for document {document_id} to {ocr_status}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to update OCR status for document {document_id}: {e}")
            raise
    
    def add_page_data(self, 
                     document_id: str, 
                     tenant_id: str, 
                     page_number: int,
                     page_data: Dict[str, Any]) -> bool:
        """
        Add or update page data for a document
        
        Args:
            document_id: Document ID
            tenant_id: Tenant ID for validation
            page_number: Page number
            page_data: Page data to add/update
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {
                "_id": ObjectId(document_id),
                "tenant_id": tenant_id,
                "deleted": False
            }
            
            # Check if page data array exists
            document = self.db.find_one(self.collection_name, query)
            if not document:
                return False
                
            # Prepare page data with page number
            page_info = {
                "page_number": page_number,
                "updated_at": datetime.utcnow(),
                **page_data
            }
            
            # Create or update page data
            if "pages" not in document:
                # First page data, create array
                update_operation = {
                    "$set": {
                        "pages": [page_info],
                        "updated_at": datetime.utcnow()
                    }
                }
            else:
                # Check if page already exists
                existing_page = None
                for i, page in enumerate(document["pages"]):
                    if page["page_number"] == page_number:
                        existing_page = i
                        break
                
                if existing_page is not None:
                    # Update existing page
                    update_operation = {
                        "$set": {
                            f"pages.{existing_page}": page_info,
                            "updated_at": datetime.utcnow()
                        }
                    }
                else:
                    # Add new page
                    update_operation = {
                        "$push": {"pages": page_info},
                        "$set": {"updated_at": datetime.utcnow()}
                    }
            
            modified = self.db.update_one(self.collection_name, query, update_operation)
            
            success = modified > 0
            logger.info(f"Added/updated page {page_number} data for document {document_id}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to add/update page data for document {document_id}: {e}")
            raise
    
    def delete(self, document_id: str, tenant_id: str) -> bool:
        """
        Soft delete a document
        
        Args:
            document_id: Document ID
            tenant_id: Tenant ID for validation
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {
                "_id": ObjectId(document_id),
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
            logger.info(f"Deleted document {document_id}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to delete document {document_id}: {e}")
            raise