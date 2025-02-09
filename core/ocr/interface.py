from abc import ABC, abstractmethod
from pathlib import Path
from typing import Tuple, List, Dict

class OCREngine(ABC):
    """Interface for OCR engines"""
    
    @abstractmethod
    def initialize(self) -> None:
        """Initialize the OCR engine"""
        pass
    
    @abstractmethod
    def process_image(self, image_path: Path) -> Tuple[List, str]:
        """
        Process a single image
        Returns: (structured_data, raw_text)
            structured_data: List of [coordinates, [text, confidence]]
            raw_text: Plain text of all recognized text
        """
        pass
    
    @abstractmethod
    def process_pdf(self, pdf_path: Path, output_dir: Path) -> List[Dict]:
        """
        Process all pages of a PDF file
        Returns: List of page data dictionaries
        """
        pass
    
    @abstractmethod
    def get_supported_languages(self) -> List[str]:
        """Get list of supported languages"""
        pass
    
    @abstractmethod
    def get_name(self) -> str:
        """Get engine name"""
        pass

class OCRResult:
    """Standardized OCR result structure"""
    def __init__(self, 
                 text: str,
                 confidence: float,
                 coordinates: List[List[float]],
                 page_number: int = 1):
        self.text = text
        self.confidence = confidence
        self.coordinates = coordinates
        self.page_number = page_number

    def to_dict(self) -> Dict:
        return {
            'text': self.text,
            'confidence': self.confidence,
            'coordinates': self.coordinates,
            'page': self.page_number
        }