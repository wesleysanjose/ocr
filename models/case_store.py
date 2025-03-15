from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
from typing import Dict, Any, List, Optional
import uuid

class CaseStore:
    def __init__(self, mongo_uri: str, db_name: str = 'forensic_system'):
        try:
            self.client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            self.client.server_info()
            self.db = self.client[db_name]
            self.cases = self.db['cases']
            self._ensure_indexes()
        except Exception as e:
            raise ConnectionError(f"Failed to connect to MongoDB: {str(e)}")

    def _ensure_indexes(self):
        indexes = [
            ("case_name", 1),
            ("client_name", 1),
            ("created_at", -1),
            ("custom_fields.key", 1),
            ("custom_fields.value", 1)
        ]
        
        for index in indexes:
            if isinstance(index, tuple):
                self.cases.create_index([index])
            else:
                self.cases.create_index(index)

    def create_case(self, case_data: Dict[str, Any]) -> str:
        """Create a new case"""
        # Validate required fields
        required_fields = ['case_name', 'client_name']
        if not all(field in case_data for field in required_fields):
            raise ValueError(f"Missing required fields. Required: {required_fields}")
        
        # Prepare custom fields if provided
        if 'custom_fields' in case_data and isinstance(case_data['custom_fields'], dict):
            custom_fields = []
            for key, value in case_data['custom_fields'].items():
                custom_fields.append({"key": key, "value": value})
            case_data['custom_fields'] = custom_fields
        else:
            case_data['custom_fields'] = []
        
        # Add metadata
        case_data.update({
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "material_ids": [],
            "status": case_data.get('status', 'active')
        })
        
        # Insert the case
        result = self.cases.insert_one(case_data)
        return str(result.inserted_id)
    
    def get_case(self, case_id: str) -> Optional[Dict[str, Any]]:
        """Get a case by ID"""
        return self.cases.find_one({"_id": ObjectId(case_id)})
    
    def update_case(self, case_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a case"""
        # Don't allow updating certain fields directly
        for field in ['_id', 'created_at', 'material_ids']:
            if field in update_data:
                del update_data[field]
        
        # Handle custom fields updates
        if 'custom_fields' in update_data and isinstance(update_data['custom_fields'], dict):
            custom_fields = []
            for key, value in update_data['custom_fields'].items():
                custom_fields.append({"key": key, "value": value})
            update_data['custom_fields'] = custom_fields
        
        update_data['updated_at'] = datetime.now()
        
        result = self.cases.update_one(
            {"_id": ObjectId(case_id)},
            {"$set": update_data}
        )
        
        return result.modified_count > 0
    
    def search_cases(self, query: Dict[str, Any], limit: int = 100) -> List[Dict[str, Any]]:
        """Search for cases based on various criteria"""
        # Build the search query
        search_query = {}
        
        if 'case_name' in query:
            search_query['case_name'] = {"$regex": query['case_name'], "$options": "i"}
        
        if 'client_name' in query:
            search_query['client_name'] = {"$regex": query['client_name'], "$options": "i"}
        
        if 'status' in query:
            search_query['status'] = query['status']
        
        if 'custom_fields' in query and isinstance(query['custom_fields'], dict):
            for key, value in query['custom_fields'].items():
                search_query['custom_fields'] = {
                    "$elemMatch": {"key": key, "value": {"$regex": value, "$options": "i"}}
                }
        
        # Execute the search
        cursor = self.cases.find(search_query).limit(limit).sort("created_at", -1)
        return list(cursor)