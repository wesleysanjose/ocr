# core/documents/processor.py

import os
import logging
import uuid
from pathlib import Path
from typing import List, Dict, Optional, BinaryIO, Union, Tuple
from datetime import datetime

from ..storage import StorageFactory
from ..ocr.factory import OCREngineFactory
from .converter import DocumentConverter

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Manages the document processing pipeline including storage, conversion, and OCR"""
    
    def __init__(self, config):
        """
        Initialize the document processor
        
        Args:
            config: Application configuration
        """
        self.config = config
        self.storage = StorageFactory.get_provider(config.STORAGE_PROVIDER, config)
        self.converter = DocumentConverter(config)
        self.ocr_engine = OCREngineFactory.create(config.OCR_ENGINE, config)
        
    def process_document(self, 
                        file_obj: BinaryIO, 
                        filename: str, 
                        tenant_id: str,
                        case_id: str,
                        document_metadata: Optional[Dict] = None) -> Dict:
        """
        Process a document through the entire pipeline
        
        Args:
            file_obj: File-like object containing the document
            filename: Original filename
            tenant_id: Tenant/client ID
            case_id: Case ID
            document_metadata: Additional metadata for the document
            
        Returns:
            Dictionary with processing results and metadata
        """
        try:
            logger.info(f"Processing document: {filename} for case {case_id}")
            
            # Generate document ID
            document_id = str(uuid.uuid4())
            
            # Determine file extension and content type
            _, file_ext = os.path.splitext(filename)
            file_ext = file_ext.lower()
            
            # Determine document type
            is_pdf = file_ext == '.pdf'
            is_image = file_ext in ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp']
            
            if not (is_pdf or is_image):
                raise ValueError(f"Unsupported file type: {file_ext}")
            
            # Create directory structure for document storage
            # Format: tenants/{tenant_id}/cases/{case_id}/documents/{document_id}/
            document_path = f"tenants/{tenant_id}/cases/{case_id}/documents/{document_id}"
            self.storage.create_directory(document_path)
            
            # Store original document
            original_path = f"{document_path}/original{file_ext}"
            file_obj.seek(0)  # Ensure we're at the start of the file
            self.storage.save_file(file_obj, original_path)
            
            # Create a temporary file for processing
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
                file_obj.seek(0)
                shutil.copyfileobj(file_obj, temp_file)
                temp_path = Path(temp_file.name)
            
            # Initialize result structure
            result = {
                'document_id': document_id,
                'tenant_id': tenant_id,
                'case_id': case_id,
                'filename': filename,
                'original_path': original_path,
                'document_type': 'pdf' if is_pdf else 'image',
                'pages': [],
                'metadata': document_metadata or {},
                'processing_complete': False,
                'processing_time': 0,
                'timestamp': datetime.utcnow()
            }
            
            start_time = datetime.utcnow()
            
            # Process the document
            if is_pdf:
                self._process_pdf(temp_path, document_path, result)
            else:
                self._process_image(temp_path, document_path, result)
            
            # Clean up temporary file
            os.unlink(temp_path)
            
            # Update processing metadata
            result['processing_complete'] = True
            result['processing_time'] = (datetime.utcnow() - start_time).total_seconds()
            
            logger.info(f"Document processing complete: {document_id}, {len(result['pages'])} pages")
            return result
            
        except Exception as e:
            logger.error(f"Document processing failed: {e}", exc_info=True)
            raise
    
    def _process_pdf(self, pdf_path: Path, document_path: str, result: Dict) -> None:
        """
        Process a PDF document
        
        Args:
            pdf_path: Path to the PDF file
            document_path: Base storage path for this document
            result: Result dictionary to update
        """
        try:
            # Convert PDF to images
            page_images = self.converter.pdf_to_images(pdf_path)
            
            # Process each page
            for image_path, metadata in page_images:
                page_num = metadata['page_number']
                
                # Create page directory
                page_dir = f"{document_path}/pages/{page_num}"
                self.storage.create_directory(page_dir)
                
                # Store the page image
                with open(image_path, 'rb') as img_file:
                    page_img_path = f"{page_dir}/page.jpg"
                    self.storage.save_file(img_file, page_img_path)
                
                # Generate thumbnail
                thumb_path = self.converter.image_to_thumbnail(image_path)
                with open(thumb_path, 'rb') as thumb_file:
                    page_thumb_path = f"{page_dir}/thumbnail.jpg"
                    self.storage.save_file(thumb_file, page_thumb_path)
                
                # Run OCR on the page
                ocr_result = self.ocr_engine.scan_image(image_path)
                
                # Store OCR results
                structured_data, raw_text = ocr_result
                ocr_data = {
                    'structured': structured_data,
                    'raw': raw_text
                }
                
                # Save OCR text
                text_path = f"{page_dir}/ocr.txt"
                self.storage.save_file(
                    BytesIO(raw_text.encode('utf-8')), 
                    text_path,
                    content_type='text/plain'
                )
                
                # Add page info to result
                page_info = {
                    'page_number': page_num,
                    'image_path': page_img_path,
                    'thumbnail_path': page_thumb_path,
                    'text_path': text_path,
                    'ocr_data': ocr_data,
                    'metadata': metadata
                }
                
                result['pages'].append(page_info)
                
                # Clean up temporary page image
                os.unlink(image_path)
                os.unlink(thumb_path)
            
        except Exception as e:
            logger.error(f"PDF processing failed: {e}", exc_info=True)
            raise
    
    def _process_image(self, image_path: Path, document_path: str, result: Dict) -> None:
        """
        Process a single image document
        
        Args:
            image_path: Path to the image file
            document_path: Base storage path for this document
            result: Result dictionary to update
        """
        try:
            # Create page directory (single page for image documents)
            page_dir = f"{document_path}/pages/1"
            self.storage.create_directory(page_dir)
            
            # Optimize image for OCR if needed
            optimized_path = self.converter.optimize_image(image_path)
            
            # Store the optimized image
            with open(optimized_path, 'rb') as img_file:
                page_img_path = f"{page_dir}/page.jpg"
                self.storage.save_file(img_file, page_img_path)
            
            # Generate thumbnail
            thumb_path = self.converter.image_to_thumbnail(optimized_path)
            with open(thumb_path, 'rb') as thumb_file:
                page_thumb_path = f"{page_dir}/thumbnail.jpg"
                self.storage.save_file(thumb_file, page_thumb_path)
            
            # Run OCR on the image
            ocr_result = self.ocr_engine.scan_image(optimized_path)
            
            # Store OCR results
            structured_data, raw_text = ocr_result
            ocr_data = {
                'structured': structured_data,
                'raw': raw_text
            }
            
            # Save OCR text
            text_path = f"{page_dir}/ocr.txt"
            self.storage.save_file(
                BytesIO(raw_text.encode('utf-8')), 
                text_path,
                content_type='text/plain'
            )
            
            # Get image metadata
            img = Image.open(image_path)
            metadata = {
                'width': img.width,
                'height': img.height,
                'format': img.format,
                'mode': img.mode
            }
            
            # Add page info to result
            page_info = {
                'page_number': 1,
                'image_path': page_img_path,
                'thumbnail_path': page_thumb_path,
                'text_path': text_path,
                'ocr_data': ocr_data,
                'metadata': metadata
            }
            
            result['pages'].append(page_info)
            
            # Clean up temporary files
            os.unlink(optimized_path)
            os.unlink(thumb_path)
            
        except Exception as e:
            logger.error(f"Image processing failed: {e}", exc_info=True)
            raise

    def get_document_preview(self, document_id: str, 
                           tenant_id: str, 
                           case_id: str, 
                           page: int = 1) -> Dict:
        """
        Get preview data for a document page
        
        Args:
            document_id: Document ID
            tenant_id: Tenant ID
            case_id: Case ID
            page: Page number to retrieve
            
        Returns:
            Dictionary with preview URLs and metadata
        """
        try:
            # Construct the path
            document_path = f"tenants/{tenant_id}/cases/{case_id}/documents/{document_id}"
            page_path = f"{document_path}/pages/{page}"
            
            # Check if page exists
            page_files = self.storage.list_files(page_path)
            if not page_files:
                raise FileNotFoundError(f"Page not found: {page_path}")
            
            # Get URLs for preview assets
            image_url = self.storage.generate_presigned_url(f"{page_path}/page.jpg")
            thumbnail_url = self.storage.generate_presigned_url(f"{page_path}/thumbnail.jpg")
            
            # Get OCR text
            text_file = self.storage.get_file(f"{page_path}/ocr.txt")
            ocr_text = text_file.read().decode('utf-8')
            
            # Get page count
            pages_dir = f"{document_path}/pages"
            page_dirs = [d for d in self.storage.list_files(pages_dir) if d.endswith('/')]
            page_count = len(page_dirs)
            
            return {
                'document_id': document_id,
                'tenant_id': tenant_id,
                'case_id': case_id,
                'page': page,
                'page_count': page_count,
                'image_url': image_url,
                'thumbnail_url': thumbnail_url,
                'ocr_text': ocr_text
            }
            
        except Exception as e:
            logger.error(f"Failed to get document preview: {e}", exc_info=True)
            raise