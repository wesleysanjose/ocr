# core/documents/converter.py

import os
import logging
import tempfile
from pathlib import Path
from typing import List, Dict, Optional, Tuple

import pdf2image
from PIL import Image

logger = logging.getLogger(__name__)

class DocumentConverter:
    """Handles conversion between document formats (PDF to JPG, etc.)"""
    
    def __init__(self, config):
        """
        Initialize the document converter
        
        Args:
            config: Application configuration
        """
        self.config = config
        self.dpi = config.PDF_TO_IMAGE_DPI
        self.temp_dir = config.TEMP_DIR
        
    def pdf_to_images(self, pdf_path: Path) -> List[Tuple[Path, dict]]:
        """
        Convert a PDF file to a series of JPEG images
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            List of tuples containing (image_path, metadata)
        """
        try:
            logger.info(f"Converting PDF to images: {pdf_path}")
            
            # Create output directory
            output_dir = Path(tempfile.mkdtemp(dir=self.temp_dir))
            
            # Convert PDF to images
            images = pdf2image.convert_from_path(
                pdf_path,
                dpi=self.dpi,
                output_folder=str(output_dir),
                fmt='jpeg',
                output_file=f"page",
                paths_only=False
            )
            
            result = []
            
            # Save each page and collect metadata
            for i, image in enumerate(images):
                page_num = i + 1
                image_path = output_dir / f"page_{page_num}.jpg"
                
                # Save the image if it's a PIL Image object
                if isinstance(image, Image.Image):
                    image.save(image_path, "JPEG")
                    image_obj = image
                else:
                    # If paths_only=True, we get strings instead of Image objects
                    image_obj = Image.open(image)
                    image_path = Path(image)
                
                # Collect metadata
                metadata = {
                    'page_number': page_num,
                    'width': image_obj.width,
                    'height': image_obj.height,
                    'format': 'JPEG',
                    'original_pdf': str(pdf_path)
                }
                
                result.append((image_path, metadata))
            
            logger.info(f"PDF conversion complete: {len(result)} pages extracted")
            return result
            
        except Exception as e:
            logger.error(f"Failed to convert PDF to images: {e}", exc_info=True)
            raise
    
    def optimize_image(self, image_path: Path, 
                      target_size: Optional[Tuple[int, int]] = None,
                      quality: int = 85) -> Path:
        """
        Optimize an image for OCR processing
        
        Args:
            image_path: Path to the source image
            target_size: Optional target size as (width, height) tuple
            quality: JPEG quality (1-100)
            
        Returns:
            Path to the optimized image
        """
        try:
            img = Image.open(image_path)
            
            # Create output path
            filename = image_path.stem + "_optimized.jpg"
            output_path = image_path.parent / filename
            
            # Resize if requested
            if target_size:
                img = img.resize(target_size, Image.LANCZOS)
            
            # Convert to RGB if it's not already (e.g., if it's RGBA)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Apply enhancements for OCR if needed
            # (e.g., contrast adjustment, denoising)
            # This can be extended based on OCR requirements
            
            # Save the optimized image
            img.save(output_path, "JPEG", quality=quality, optimize=True)
            
            logger.info(f"Image optimized: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to optimize image: {e}", exc_info=True)
            raise

    def image_to_thumbnail(self, image_path: Path, 
                         size: Tuple[int, int] = (200, 200)) -> Path:
        """
        Create a thumbnail from an image
        
        Args:
            image_path: Path to the source image
            size: Thumbnail size as (width, height) tuple
            
        Returns:
            Path to the thumbnail
        """
        try:
            img = Image.open(image_path)
            
            # Create output path
            filename = image_path.stem + "_thumb.jpg"
            output_path = image_path.parent / filename
            
            # Create thumbnail
            img.thumbnail(size)
            
            # Save the thumbnail
            img.save(output_path, "JPEG", quality=80, optimize=True)
            
            logger.info(f"Thumbnail created: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to create thumbnail: {e}", exc_info=True)
            raise