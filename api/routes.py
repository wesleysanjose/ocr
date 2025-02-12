from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import logging
from pathlib import Path

from utils.helpers import create_upload_dir, allowed_file, cleanup_dir

logger = logging.getLogger(__name__)
bp = Blueprint('api', __name__)

def init_api(ocr_processor, document_analyzer, config):
    """Initialize API routes with dependencies"""
    
    @bp.route('/ocr', methods=['POST'])
    def ocr_endpoint():
        """Handle OCR processing requests"""
        logger.info("Received OCR request")
        logger.debug(f"Request headers: {dict(request.headers)}")
        
        if 'file' not in request.files:
            logger.error("No file in request")
            return jsonify({'error': 'No file provided'}), 400
            
        file = request.files['file']
        if not file.filename:
            logger.error("Empty filename")
            return jsonify({'error': 'No file selected'}), 400
            
        if not allowed_file(file.filename, config.ALLOWED_EXTENSIONS):
            logger.error(f"Invalid file type: {file.filename}")
            return jsonify({'error': 'File type not allowed'}), 400
            
        try:
            upload_dir = create_upload_dir(Path(config.UPLOAD_FOLDER))
            filename = secure_filename(file.filename)
            filepath = upload_dir / filename
            
            logger.info(f"Saving file to: {filepath}")
            file.save(filepath)
            
            try:
                if filename.lower().endswith('.pdf'):
                    pages_data = ocr_processor.process_pdf(filepath, upload_dir)
                    response_data = {
                        'isPdf': True,
                        'totalPages': len(pages_data),
                        'pages': pages_data
                    }
                else:
                    structured_data, raw_text = ocr_processor.process_image(filepath)
                    preview_data = ocr_processor._get_base64_image(filepath)
                    response_data = {
                        'isPdf': False,
                        'totalPages': len(pages_data),
                        'pages': pages_data
                    }

                if not config.KEEP_FILES:
                    cleanup_dir(upload_dir)
                    
                return jsonify(response_data)

            except Exception as process_error:
                logger.error(f"Processing error: {str(process_error)}", exc_info=True)
                cleanup_dir(upload_dir)
                return jsonify({'error': str(process_error)}), 500
                
        except Exception as e:
            logger.error(f"OCR request error: {str(e)}", exc_info=True)
            return jsonify({'error': 'Internal server error'}), 500

    @bp.route('/analyze', methods=['POST'])
    def analyze_endpoint():
        """Handle AI analysis requests"""
        if not request.is_json or 'text' not in request.json:
            return jsonify({'error': 'No text provided'}), 400
            
        try:
            analysis = document_analyzer.analyze_text(request.json['text'])
            return jsonify({'analysis': analysis})
        except Exception as e:
            logger.error(f"Analysis error: {str(e)}", exc_info=True)
            return jsonify({'error': 'Failed to analyze text'}), 500

    return bp