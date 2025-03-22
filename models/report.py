# models/report.py

import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
import uuid

from bson.objectid import ObjectId

logger = logging.getLogger(__name__)

class Report:
    """MongoDB model for forensic reports"""
    
    collection_name = "reports"
    
    def __init__(self, db):
        """
        Initialize Report model
        
        Args:
            db: MongoDB instance
        """
        self.db = db
        self.collection = db.get_collection(self.collection_name)
    
    def create(self, 
              tenant_id: str,
              case_id: str,
              title: str,
              report_type: str,
              content: Dict[str, Any],
              document_ids: Optional[List[str]] = None,
              field_data: Optional[Dict[str, Any]] = None,
              status: str = "draft",
              created_by: Optional[str] = None) -> str:
        """
        Create a new report
        
        Args:
            tenant_id: Tenant/client ID
            case_id: Case ID
            title: Report title
            report_type: Type of report
            content: Report content
            document_ids: List of document IDs used in the report
            field_data: Structured field data for the report
            status: Report status
            created_by: User ID who created the report
            
        Returns:
            Report ID
        """
        now = datetime.utcnow()
        
        report_doc = {
            "tenant_id": tenant_id,
            "case_id": case_id,
            "title": title,
            "report_type": report_type,
            "content": content,
            "document_ids": document_ids or [],
            "field_data": field_data or {},
            "status": status,
            "versions": [],
            "analysis_results": None,
            "created_by": created_by,
            "created_at": now,
            "updated_at": now,
            "deleted": False
        }
        
        try:
            report_id = self.db.insert_one(self.collection_name, report_doc)
            logger.info(f"Created report: {report_id}, title: {title}")
            return report_id
        except Exception as e:
            logger.error(f"Failed to create report: {e}")
            raise
    
    def get(self, report_id: str, tenant_id: str) -> Optional[Dict]:
        """
        Get a report by ID
        
        Args:
            report_id: Report ID
            tenant_id: Tenant ID for validation
            
        Returns:
            Report record or None
        """
        try:
            query = {
                "_id": ObjectId(report_id),
                "tenant_id": tenant_id,
                "deleted": False
            }
            report = self.db.find_one(self.collection_name, query)
            if report:
                report["id"] = str(report["_id"])
            return report
        except Exception as e:
            logger.error(f"Failed to get report {report_id}: {e}")
            raise
    
    def list_by_case(self, 
                    case_id: str, 
                    tenant_id: str,
                    status: Optional[str] = None,
                    limit: int = 50,
                    skip: int = 0) -> List[Dict]:
        """
        List reports for a case
        
        Args:
            case_id: Case ID
            tenant_id: Tenant ID for validation
            status: Filter by status
            limit: Maximum number of reports to return
            skip: Number of reports to skip
            
        Returns:
            List of report records
        """
        try:
            query = {
                "case_id": case_id,
                "tenant_id": tenant_id,
                "deleted": False
            }
            
            if status:
                query["status"] = status
            
            sort_settings = [("created_at", -1)]
            
            reports = self.db.find(
                self.collection_name,
                query,
                sort=sort_settings,
                limit=limit,
                skip=skip
            )
            
            # Add ID field
            for report in reports:
                report["id"] = str(report["_id"])
                
            logger.info(f"Found {len(reports)} reports for case {case_id}")
            return reports
            
        except Exception as e:
            logger.error(f"Failed to list reports for case {case_id}: {e}")
            raise
    
    def update(self, 
              report_id: str, 
              tenant_id: str, 
              updates: Dict[str, Any],
              create_version: bool = False) -> bool:
        """
        Update a report
        
        Args:
            report_id: Report ID
            tenant_id: Tenant ID for validation
            updates: Dictionary of updates to apply
            create_version: Whether to create a version record
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {
                "_id": ObjectId(report_id),
                "tenant_id": tenant_id,
                "deleted": False
            }
            
            # Get the current report if we need to create a version
            current_report = None
            if create_version:
                current_report = self.db.find_one(self.collection_name, query)
                if not current_report:
                    return False
            
            # Don't allow updating certain fields
            for field in ["_id", "tenant_id", "case_id", "created_at", "created_by", "deleted"]:
                if field in updates:
                    del updates[field]
            
            # Add updated timestamp
            updates["updated_at"] = datetime.utcnow()
            
            # Create version if requested
            if create_version and current_report:
                version = {
                    "version_number": len(current_report.get("versions", [])) + 1,
                    "timestamp": datetime.utcnow(),
                    "content": current_report.get("content", {}),
                    "field_data": current_report.get("field_data", {}),
                    "status": current_report.get("status", "draft"),
                    "created_by": current_report.get("created_by")
                }
                
                updates["$push"] = {"versions": version}
            
            # Update the report
            update_operation = {"$set": updates}
            
            modified = self.db.update_one(self.collection_name, query, update_operation)
            
            success = modified > 0
            logger.info(f"Updated report {report_id}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to update report {report_id}: {e}")
            raise
    
    def update_analysis(self, 
                       report_id: str, 
                       tenant_id: str, 
                       analysis_results: Dict[str, Any]) -> bool:
        """
        Update AI analysis results for a report
        
        Args:
            report_id: Report ID
            tenant_id: Tenant ID for validation
            analysis_results: AI analysis results
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {
                "_id": ObjectId(report_id),
                "tenant_id": tenant_id,
                "deleted": False
            }
            
            updates = {
                "analysis_results": analysis_results,
                "updated_at": datetime.utcnow()
            }
            
            update_operation = {"$set": updates}
            
            modified = self.db.update_one(self.collection_name, query, update_operation)
            
            success = modified > 0
            logger.info(f"Updated analysis results for report {report_id}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to update analysis for report {report_id}: {e}")
            raise
    
    def change_status(self, 
                     report_id: str, 
                     tenant_id: str, 
                     new_status: str,
                     updated_by: Optional[str] = None) -> bool:
        """
        Change the status of a report
        
        Args:
            report_id: Report ID
            tenant_id: Tenant ID for validation
            new_status: New status value
            updated_by: User ID who updated the status
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {
                "_id": ObjectId(report_id),
                "tenant_id": tenant_id,
                "deleted": False
            }
            
            updates = {
                "status": new_status,
                "updated_at": datetime.utcnow()
            }
            
            if updated_by:
                updates["updated_by"] = updated_by
            
            update_operation = {"$set": updates}
            
            modified = self.db.update_one(self.collection_name, query, update_operation)
            
            success = modified > 0
            logger.info(f"Changed status for report {report_id} to {new_status}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to change status for report {report_id}: {e}")
            raise
    
    def delete(self, report_id: str, tenant_id: str) -> bool:
        """
        Soft delete a report
        
        Args:
            report_id: Report ID
            tenant_id: Tenant ID for validation
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query = {
                "_id": ObjectId(report_id),
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
            logger.info(f"Deleted report {report_id}: {success}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to delete report {report_id}: {e}")
            raise