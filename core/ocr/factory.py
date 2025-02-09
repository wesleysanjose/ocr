from typing import Dict, Type
from .interface import OCREngine
from .paddle_ocr import PaddleOCREngine

class OCREngineFactory:
    """Factory for creating OCR engines"""
    
    _engines: Dict[str, Type[OCREngine]] = {
        'paddle': PaddleOCREngine
        # Add other engines here as they're implemented
        # 'tesseract': TesseractOCREngine,
        # 'azure': AzureOCREngine,
        # etc.
    }

    @classmethod
    def create(cls, engine_name: str, config) -> OCREngine:
        """Create an OCR engine instance"""
        engine_class = cls._engines.get(engine_name.lower())
        if not engine_class:
            raise ValueError(f"Unknown OCR engine: {engine_name}")
        return engine_class(config)

    @classmethod
    def register_engine(cls, name: str, engine_class: Type[OCREngine]) -> None:
        """Register a new OCR engine"""
        cls._engines[name.lower()] = engine_class

    @classmethod
    def get_available_engines(cls) -> list:
        """Get list of available OCR engines"""
        return list(cls._engines.keys())