from typing import Dict, Any, List, Optional, BinaryIO
import uuid
from datetime import datetime

from .material_store import MaterialStore
from .case_store import CaseStore
from storage.document_storage import DocumentStorage

class DocumentManager:
    """Manager class to handle documents across storage and database"""
    
    def __init__(self, material_store: MaterialStore, case_store: CaseStore, document_storage: DocumentStorage):
        self.material_store = material_store
        self.case_store = case_store
        self.document_storage = document_storage
    
    def add_document_to_case(self, case_id: str, file_obj: BinaryIO, metadata: Dict[str, Any]) -> Dict[str, str]:
        """Add a document to a case, storing both the file and metadata"""
        # Verify case exists
        case = self.case_store.get_case(case_id)
        if not case:
            raise ValueError(f"Case {case_id} does not exist")
        
        # Generate document ID
        document_id = str(uuid.uuid4())
        
        # Store the document
        storage_path = self.document_storage.store_document(file_obj, document_id, metadata)
        
        # Prepare material data
        material_data = {
            "material_type": "document",
            "source": metadata.get("source", "upload"),
            "document_id": document_id,
            "storage_path": storage_path,
            "filename": metadata.get("filename", "unknown"),
            "mime_type": metadata.get("mime_type", "application/octet-stream"),
            "file_size": metadata.get("file_size", 0),
            "metadata": metadata,
            "ocr_results": []
        }
        
        # Create material record
        material_id = self.material_store.create_material(case_id, material_data)
        
        return {
            "case_id": case_id,
            "material_id": material_id,
            "document_id": document_id,
            "storage_path": storage_path
        }
    
    def add_ocr_result(self, material_id: str, ocr_engine: str, ocr_data: Dict[str, Any]) -> bool:
        """Add OCR result to an existing document"""
        return self.material_store.add_ocr_result(material_id, ocr_engine, ocr_data)
    
    def add_analysis_result(self, material_id: str, analysis_data: Dict[str, Any]) -> bool:
        """Add analysis result to an existing document"""
        result = self.material_store.materials.update_one(
            {"_id": ObjectId(material_id)},
            {
                "$push": {"analysis_results": analysis_data},
                "$set": {"updated_at": datetime.now()}
            }
        )
        
        return result.modified_count > 0
    
    def get_document(self, document_id: str) -> Optional[BinaryIO]:
        """Retrieve a document by its ID"""
        return self.document_storage.get_document(document_id)
    
    def get_document_metadata(self, material_id: str) -> Optional[Dict[str, Any]]:
        """Get document metadata by material ID"""
        material = self.material_store.get_material(material_id)
        if not material:
            return None
        return material
    
    def get_case_documents(self, case_id: str) -> List[Dict[str, Any]]:
        """Get all documents for a case"""
        return self.material_store.get_materials_by_case(case_id)
    
    def search_documents(self, query: Dict[str, Any], limit: int = 100) -> List[Dict[str, Any]]:
        """Search for documents based on various criteria"""
        # This would need to be implemented in MaterialStore
        # For now, we'll return an empty list
        return []
    
    def delete_document(self, material_id: str) -> bool:
        """Delete a document and its metadata"""
        material = self.material_store.get_material(material_id)
        if not material:
            return False
        
        document_id = material.get("document_id")
        if not document_id:
            return False
        
        # Delete from storage
        storage_success = self.document_storage.delete_document(document_id)
        
        # Delete from database (this would need to be implemented in MaterialStore)
        # For now, we'll just return the storage success
        return storage_success