import logging
from pathlib import Path
from typing import Tuple, List, Dict
import base64
from paddleocr import PaddleOCR
import pdf2image

from .interface import OCREngine, OCRResult

logger = logging.getLogger(__name__)

class PaddleOCREngine(OCREngine):
    """PaddleOCR implementation"""
    
    def __init__(self, config):
        self.config = config
        self.engine = None
        self.supported_languages = ['ch', 'en', 'fr', 'german', 'korean', 'japan']
        self.initialize()

    def initialize(self) -> None:
        """Initialize PaddleOCR engine"""
        try:
            self.engine = PaddleOCR(
                use_angle_cls=self.config.USE_ANGLE_CLS,
                lang=self.config.OCR_LANG
            )
            logger.info("PaddleOCR engine initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR: {e}", exc_info=True)
            raise

    def process_image(self, image_path: Path) -> List[Dict]:
        """Process single image with PaddleOCR"""
        pages_data = []

        try:
            logger.info(f"Processing image: {image_path}")
            structured_data, raw_text = self.scan_image(image_path)
            preview_data = self._get_base64_image(image_path)
                
            pages_data.append({
                    'page': 0,
                    'preview': f"data:image/jpeg;base64,{preview_data}",
                    'data': structured_data,
                    'raw': raw_text
            })
            
            return pages_data

        except Exception as e:
            logger.error(f"PaddleOCR processing error: {e}", exc_info=True)
            raise

    def scan_image(self, image_path: Path) -> Tuple[List, str]:
        """Process single image with PaddleOCR"""
        try:
            logger.info(f"Processing image: {image_path}")
            result = self.engine.ocr(str(image_path), cls=True)
            
            structured_data = []
            raw_text = []

            for block_idx, res in enumerate(result):
                for line in res:
                    if len(line) >= 2:
                        coords, (text, confidence) = line
                        ocr_result = OCRResult(
                            text=text,
                            confidence=float(confidence),
                            coordinates=coords
                        )
                        structured_data.append([coords, [text, float(confidence)]])
                        raw_text.append(text)

            return structured_data, '\n'.join(raw_text)

        except Exception as e:
            logger.error(f"PaddleOCR processing error: {e}", exc_info=True)
            raise

    def process_pdf(self, pdf_path: Path, output_dir: Path) -> List[Dict]:
        """Process PDF document"""
        try:
            logger.info(f"Converting PDF: {pdf_path}")
            images = pdf2image.convert_from_path(str(pdf_path))
            
            pages_data = []
            for i, image in enumerate(images, 1):
                preview_path = output_dir / f"page_{i}.jpg"
                image.save(preview_path, 'JPEG')
                
                structured_data, raw_text = self.scan_image(preview_path)
                preview_data = self._get_base64_image(preview_path)
                
                pages_data.append({
                    'page': i,
                    'preview': f"data:image/jpeg;base64,{preview_data}",
                    'data': structured_data,
                    'raw': raw_text
                })
            
            return pages_data

        except Exception as e:
            logger.error(f"PDF processing error: {e}", exc_info=True)
            raise

    def get_supported_languages(self) -> List[str]:
        """Get supported languages"""
        return self.supported_languages

    def get_name(self) -> str:
        """Get engine name"""
        return "PaddleOCR"

    @staticmethod
    def _get_base64_image(image_path: Path) -> str:
        """Convert image to base64 string"""
        with open(image_path, 'rb') as img_file:
            return base64.b64encode(img_file.read()).decode('utf-8')