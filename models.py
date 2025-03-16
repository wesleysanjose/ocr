from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from bson import ObjectId
import uuid

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

class OCRResult(BaseModel):
    text: str
    confidence: float
    coordinates: List[List[float]]
    page_number: int = 1

    class Config:
        arbitrary_types_allowed = True

class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    file_type: str
    upload_time: datetime = Field(default_factory=datetime.now)
    ocr_data: Optional[Dict[str, Any]] = None
    document_type: str  # 病历、事故报告等
    preview_url: Optional[str] = None
    raw_text: Optional[str] = None
    processed_text: Optional[Dict[str, str]] = None
    ai_analysis: Optional[str] = None

    class Config:
        arbitrary_types_allowed = True

class Case(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    case_number: str
    name: str
    phone: str
    type: str  # 案件类型：交通事故、工伤等
    status: str  # 状态：待处理、进行中、待审核、已完成
    create_time: datetime = Field(default_factory=datetime.now)
    update_time: datetime = Field(default_factory=datetime.now)
    documents: List[Document] = []
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}