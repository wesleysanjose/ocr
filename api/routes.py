from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import logging
from pathlib import Path
import os
import json
from datetime import datetime

from utils.helpers import create_upload_dir, allowed_file, cleanup_dir
from models.case_store import CaseStore
from models.material_store import MaterialStore
from models.document_manager import DocumentManager
from storage.storage_factory import StorageFactory

logger = logging.getLogger(__name__)
bp = Blueprint('api', __name__)

def init_api(ocr_processor, document_analyzer, config):
    """Initialize API routes with dependencies"""
    
    # Initialize case management components
    case_store = CaseStore(config.MONGO_URI)
    material_store = MaterialStore(config.MONGO_URI)
    storage = StorageFactory.create_storage(config.STORAGE_CONFIG)
    document_manager = DocumentManager(material_store, case_store, storage)
    
    # Case management endpoints
    @bp.route('/cases', methods=['GET'])
    def get_cases():
        """Get list of cases with optional filters"""
        try:
            client_name = request.args.get('client_name')
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            
            # Build search query
            query = {}
            if client_name:
                query['client_name'] = client_name
                
            # Add custom fields from request
            custom_fields = {}
            for key, value in request.args.items():
                if key.startswith('custom_'):
                    field_name = key[7:]  # Remove 'custom_' prefix
                    custom_fields[field_name] = value
                    
            if custom_fields:
                query['custom_fields'] = custom_fields
                
            # Get limit parameter
            limit = int(request.args.get('limit', 100))
            
            # Search cases
            cases = case_store.search_cases(query, limit)
            return jsonify(cases)
        except Exception as e:
            logger.error(f"Error getting cases: {str(e)}")
            return jsonify({"error": str(e)}), 500

    @bp.route('/cases', methods=['POST'])
    def create_case():
        """Create a new case"""
        try:
            case_data = request.get_json()
            case_id = case_store.create_case(case_data)
            return jsonify({"id": case_id}), 201
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            logger.error(f"Error creating case: {str(e)}")
            return jsonify({"error": str(e)}), 500

    @bp.route('/cases/<case_id>', methods=['GET'])
    def get_case(case_id):
        """Get a specific case by ID"""
        try:
            case = case_store.get_case(case_id)
            if not case:
                return jsonify({"error": "Case not found"}), 404
            return jsonify(case)
        except Exception as e:
            logger.error(f"Error getting case {case_id}: {str(e)}")
            return jsonify({"error": str(e)}), 500

    @bp.route('/cases/<case_id>', methods=['PUT'])
    def update_case(case_id):
        """Update a specific case"""
        try:
            update_data = request.get_json()
            success = case_store.update_case(case_id, update_data)
            if not success:
                return jsonify({"error": "Case not found"}), 404
            return jsonify({"message": "Case updated successfully"})
        except Exception as e:
            logger.error(f"Error updating case {case_id}: {str(e)}")
            return jsonify({"error": str(e)}), 500

    # Document management endpoints
    @bp.route('/cases/<case_id>/documents', methods=['POST'])
    def upload_document(case_id):
        """Upload a document to a case"""
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        if not allowed_file(file.filename, config.ALLOWED_EXTENSIONS):
            return jsonify({"error": "File type not allowed"}), 400
        
        try:
            # Get metadata from form
            metadata = {
                "filename": secure_filename(file.filename),
                "mime_type": file.content_type,
                "file_size": os.fstat(file.fileno()).st_size,
                "source": request.form.get("source", "upload"),
                "description": request.form.get("description", "")
            }
            
            # Add custom metadata if provided
            if "metadata" in request.form:
                try:
                    custom_metadata = json.loads(request.form["metadata"])
                    metadata.update(custom_metadata)
                except json.JSONDecodeError:
                    pass
            
            # Add document to case
            result = document_manager.add_document_to_case(case_id, file, metadata)
            
            # Optionally run OCR if requested
            if request.form.get("run_ocr", "false").lower() == "true":
                material_id = result["material_id"]
                document_id = result["document_id"]
                
                # Create temporary directory for processing
                upload_dir = create_upload_dir(Path(config.UPLOAD_FOLDER))
                temp_path = upload_dir / secure_filename(file.filename)
                
                # Get the file again for OCR
                file.seek(0)
                file.save(temp_path)
                
                try:
                    # Process with OCR
                    if temp_path.suffix.lower() == '.pdf':
                        pages_data = ocr_processor.process_pdf(temp_path, upload_dir)
                    else:
                        pages_data = ocr_processor.process_image(temp_path)
                    
                    # Add OCR results
                    document_manager.add_ocr_result(material_id, ocr_processor.get_name(), {
                        "pages": pages_data,
                        "language": config.OCR_LANG
                    })
                    
                    # Update result with OCR status
                    result["ocr_status"] = "completed"
                    result["ocr_results"] = pages_data
                except Exception as e:
                    logger.error(f"OCR processing error: {str(e)}")
                    result["ocr_status"] = f"failed: {str(e)}"
                finally:
                    # Clean up temp files
                    if not config.KEEP_FILES:
                        cleanup_dir(upload_dir)
            
            return jsonify(result), 201
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            logger.error(f"Failed to upload document: {str(e)}")
            return jsonify({"error": f"Failed to upload document: {str(e)}"}), 500

    @bp.route('/cases/<case_id>/documents', methods=['GET'])
    def get_case_documents(case_id):
        """Get all documents for a case"""
        try:
            documents = document_manager.get_case_documents(case_id)
            return jsonify(documents), 200
        except Exception as e:
            logger.error(f"Error getting documents for case {case_id}: {str(e)}")
            return jsonify({"error": f"Failed to get documents: {str(e)}"}), 500

    @bp.route('/documents/<material_id>', methods=['GET'])
    def get_document(material_id):
        """Get a specific document metadata"""
        try:
            document = document_manager.get_document_metadata(material_id)
            if not document:
                return jsonify({"error": "Document not found"}), 404
            return jsonify(document), 200
        except Exception as e:
            logger.error(f"Error getting document {material_id}: {str(e)}")
            return jsonify({"error": f"Failed to get document: {str(e)}"}), 500

    @bp.route('/documents/<material_id>/ocr', methods=['POST'])
    def run_ocr_on_document(material_id):
        """Run OCR on an existing document"""
        try:
            document = document_manager.get_document_metadata(material_id)
            if not document:
                return jsonify({"error": "Document not found"}), 404
                
            document_id = document.get("document_id")
            if not document_id:
                return jsonify({"error": "Invalid document metadata"}), 400
                
            # Get document from storage
            file_obj = document_manager.get_document(document_id)
            if not file_obj:
                return jsonify({"error": "Document file not found"}), 404
                
            # Create temporary directory for processing
            upload_dir = create_upload_dir(Path(config.UPLOAD_FOLDER))
            filename = document.get("filename", f"{document_id}.bin")
            temp_path = upload_dir / secure_filename(filename)
            
            # Save file for OCR processing
            with open(temp_path, 'wb') as f:
                f.write(file_obj.read())
                
            try:
                # Process with OCR
                if temp_path.suffix.lower() == '.pdf':
                    pages_data = ocr_processor.process_pdf(temp_path, upload_dir)
                else:
                    pages_data = ocr_processor.process_image(temp_path)
                
                # Add OCR results
                document_manager.add_ocr_result(material_id, ocr_processor.get_name(), {
                    "pages": pages_data,
                    "language": config.OCR_LANG
                })
                
                result = {
                    "material_id": material_id,
                    "ocr_status": "completed",
                    "ocr_results": pages_data
                }
                
                return jsonify(result), 200
            except Exception as e:
                logger.error(f"OCR processing error: {str(e)}")
                return jsonify({"error": f"OCR processing failed: {str(e)}"}), 500
            finally:
                # Clean up temp files
                if not config.KEEP_FILES:
                    cleanup_dir(upload_dir)
                    
        except Exception as e:
            logger.error(f"Error running OCR on document {material_id}: {str(e)}")
            return jsonify({"error": f"Failed to run OCR: {str(e)}"}), 500
        
    # Add a route to analyze document text
    @bp.route('/documents/<material_id>/analyze', methods=['POST'])
    def analyze_document(material_id):
        """Analyze text from a document"""
        try:
            document = document_manager.get_document_metadata(material_id)
            if not document:
                return jsonify({"error": "Document not found"}), 404
            
            # Get the OCR results
            ocr_results = document.get("ocr_results", [])
            if not ocr_results:
                return jsonify({"error": "No OCR results found for this document"}), 400
            
            # Extract text from the latest OCR result
            latest_ocr = ocr_results[-1] if ocr_results else None
            if not latest_ocr or "data" not in latest_ocr:
                return jsonify({"error": "Invalid OCR data format"}), 400
            
            # Extract text from OCR data
            ocr_data = latest_ocr["data"]
            text = ""
            
            # Handle different OCR result formats
            if "pages" in ocr_data:
                # Multiple pages format
                for page in ocr_data["pages"]:
                    if "text" in page:
                        text += page["text"] + "\n\n"
            elif "text" in ocr_data:
                # Single text field format
                text = ocr_data["text"]
            else:
                return jsonify({"error": "Could not extract text from OCR results"}), 400
            
            # Analyze the text
            analysis = document_analyzer.analyze_text(text)
            
            # Store the analysis result with the document
            document_manager.add_analysis_result(material_id, {
                "text": text,
                "analysis": analysis,
                "timestamp": datetime.now().isoformat()
            })
            
            return jsonify({
                "material_id": material_id,
                "analysis": analysis
            }), 200
            
        except Exception as e:
            logger.error(f"Error analyzing document {material_id}: {str(e)}")
            return jsonify({"error": f"Failed to analyze document: {str(e)}"}), 500
    
    # Add a route to get document content
    @bp.route('/documents/<material_id>/content', methods=['GET'])
    def get_document_content(material_id):
        """Get the document content (file)"""
        try:
            document = document_manager.get_document_metadata(material_id)
            if not document:
                return jsonify({"error": "Document not found"}), 404
                
            document_id = document.get("document_id")
            if not document_id:
                return jsonify({"error": "Invalid document metadata"}), 400
                
            # Get document from storage
            file_obj = document_manager.get_document(document_id)
            if not file_obj:
                return jsonify({"error": "Document file not found"}), 404
            
            # Get filename and mime type
            filename = document.get("filename", f"{document_id}")
            mime_type = document.get("mime_type", "application/octet-stream")
            
            # Create a Flask response with the file content
            from flask import send_file
            from io import BytesIO
            
            # Read the file content
            content = file_obj.read()
            
            # Create a BytesIO object
            file_stream = BytesIO(content)
            
            # Return the file
            return send_file(
                file_stream,
                mimetype=mime_type,
                as_attachment=True,
                download_name=filename
            )
                
        except Exception as e:
            logger.error(f"Error getting document content {material_id}: {str(e)}")
            return jsonify({"error": f"Failed to get document content: {str(e)}"}), 500

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