from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
from typing import Dict, Any, List, Optional
import uuid

class MaterialStore:
    def __init__(self, mongo_uri: str, db_name: str = 'forensic_system'):
        try:
            self.client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            self.client.server_info()
            self.db = self.client[db_name]
            self.materials = self.db['materials']
            self._ensure_indexes()
        except Exception as e:
            raise ConnectionError(f"Failed to connect to MongoDB: {str(e)}")

    def _ensure_indexes(self):
        """Create indexes for the materials collection"""
        try:
            # The error is happening here with the index format
            # The format should be a list of tuples or a list of (key, direction) pairs
            # Instead of passing an integer directly, we need to use pymongo's index direction constants
            
            # Fix the index creation by using proper format
            from pymongo import ASCENDING, DESCENDING, TEXT
            
            # Create indexes with proper format
            self.materials.create_index([("case_id", ASCENDING)])
            self.materials.create_index([("document_id", ASCENDING)])
            self.materials.create_index([("created_at", DESCENDING)])
            self.materials.create_index([("filename", TEXT)], default_language='english')
            
            # If you need compound indexes, format them like this:
            # self.materials.create_index([("case_id", ASCENDING), ("created_at", DESCENDING)])
        except Exception as e:
            print(f"Error creating indexes: {str(e)}")
            raise

    def create_material(self, case_id: str, material_data: Dict[str, Any]) -> str:
        # Validate case_id exists
        if not self.db['cases'].find_one({"_id": ObjectId(case_id)}):
            raise ValueError(f"Case {case_id} does not exist")
            
        # Data validation and cleaning
        required_fields = ['material_type', 'source']
        if not all(field in material_data for field in required_fields):
            raise ValueError(f"Missing required fields. Required: {required_fields}")
            
        # Add metadata
        material_data.update({
            "case_id": ObjectId(case_id),
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "_version": 1,
            "status": material_data.get('status', 'new'),
            "document_id": material_data.get('document_id', str(uuid.uuid4()))
        })
        
        # Insert the material
        result = self.materials.insert_one(material_data)
        
        # Update the case with reference to this material
        self.db['cases'].update_one(
            {"_id": ObjectId(case_id)},
            {"$addToSet": {"material_ids": str(result.inserted_id)}}
        )
        
        return str(result.inserted_id)
    
    def get_materials_by_case(self, case_id: str) -> List[Dict[str, Any]]:
        """Get all materials for a specific case"""
        cursor = self.materials.find({"case_id": ObjectId(case_id)})
        return list(cursor)
    
    def get_material(self, material_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific material by ID"""
        return self.materials.find_one({"_id": ObjectId(material_id)})
    
    def add_ocr_result(self, material_id: str, ocr_engine: str, ocr_data: Dict[str, Any]) -> bool:
        """Add OCR result to an existing material"""
        ocr_entry = {
            "engine": ocr_engine,
            "timestamp": datetime.now(),
            "data": ocr_data
        }
        
        result = self.materials.update_one(
            {"_id": ObjectId(material_id)},
            {
                "$push": {"ocr_results": ocr_entry},
                "$set": {"updated_at": datetime.now()}
            }
        )
        
        return result.modified_count > 0