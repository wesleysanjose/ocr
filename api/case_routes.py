# case_routes.py
from flask import Blueprint, request, jsonify
import logging
import traceback
from bson import ObjectId, errors as bson_errors
from datetime import datetime
import uuid
import os
from pathlib import Path
import json
import base64
from werkzeug.utils import secure_filename

# Import your OCR processor and document analyzer
from core.ocr.factory import OCREngineFactory
from core.analyzer import DocumentAnalyzer
from utils.helpers import create_upload_dir, allowed_file

logger = logging.getLogger(__name__)

def init_case_api(db, ocr_processor, document_analyzer, config):
    """Initialize case management API routes"""
    case_bp = Blueprint('case', __name__)
    
    @case_bp.route('/', methods=['GET'])
    def get_cases():
        """Get list of cases with optional filtering"""
        logger.info("GET /cases/ - Retrieving cases list")
        try:
            # Get query parameters
            status = request.args.get('status')
            skip = int(request.args.get('skip', 0))
            limit = int(request.args.get('limit', 20))
            
            logger.debug(f"Query params: status={status}, skip={skip}, limit={limit}")
            
            # Build query
            query = {}
            if status and status != '全部':
                query['status'] = status
                
            logger.debug(f"MongoDB query: {query}")
                
            # Execute query using synchronous PyMongo
            cursor = db.cases.find(query).sort('create_time', -1).skip(skip).limit(limit)
            cases = list(cursor)  # Convert cursor to list
            
            # Count total
            total = db.cases.count_documents(query)
            
            logger.info(f"Found {total} cases, returning {len(cases)} results")
            
            # Process for JSON response
            for case in cases:
                case['id'] = str(case.pop('_id'))
                
            return jsonify({
                'cases': cases,
                'total': total,
                'page': skip // limit + 1,
                'pages': (total + limit - 1) // limit
            })
            
        except ValueError as e:
            logger.error(f"Invalid parameter value: {str(e)}")
            return jsonify({'error': f"Invalid parameter: {str(e)}"}), 400
        except Exception as e:
            logger.error(f"Error getting cases: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({'error': str(e)}), 500
    
    @case_bp.route('/', methods=['POST'])
    def create_case():
        """Create a new case"""
        logger.info("POST /cases/ - Creating new case")
        try:
            data = request.json
            if not data:
                logger.warning("No JSON data in request")
                return jsonify({'error': 'No data provided'}), 400
                
            logger.debug(f"Request data: {data}")
            
            # Generate case number if not provided
            if 'case_number' not in data:
                prefix = "JD" + datetime.now().strftime("%Y%m")
                logger.debug(f"Generating case number with prefix: {prefix}")
                
                counter = db.counters.find_one_and_update(
                    {'_id': 'case_number'},
                    {'$inc': {'seq': 1}},
                    upsert=True,
                    return_document=True
                )
                
                seq_num = counter['seq'] if counter and 'seq' in counter else 1
                data['case_number'] = f"{prefix}{seq_num:03d}"
                logger.debug(f"Generated case number: {data['case_number']}")
            
            # Set timestamps
            now = datetime.now()
            data['create_time'] = now
            data['update_time'] = now
            
            # Initialize empty documents list
            if 'documents' not in data:
                data['documents'] = []
                
            # Insert into database
            result = db.cases.insert_one(data)
            logger.info(f"Case created with ID: {result.inserted_id}")
            
            # Return created case
            case = db.cases.find_one({'_id': result.inserted_id})
            case['id'] = str(case.pop('_id'))
            
            return jsonify(case), 201
            
        except Exception as e:
            logger.error(f"Error creating case: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({'error': str(e)}), 500
    
    @case_bp.route('/<case_id>', methods=['GET'])
    def get_case(case_id):
        """Get a single case by ID"""
        logger.info(f"GET /cases/{case_id} - Retrieving case")
        try:
            # Validate ObjectId
            try:
                obj_id = ObjectId(case_id)
            except bson_errors.InvalidId:
                logger.warning(f"Invalid case ID format: {case_id}")
                return jsonify({'error': 'Invalid case ID format'}), 400
                
            case = db.cases.find_one({'_id': obj_id})
            if not case:
                logger.warning(f"Case not found: {case_id}")
                return jsonify({'error': 'Case not found'}), 404
                
            logger.debug(f"Found case: {case['_id']}")
            case['id'] = str(case.pop('_id'))
            return jsonify(case)
            
        except Exception as e:
            logger.error(f"Error getting case {case_id}: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({'error': str(e)}), 500
    
    @case_bp.route('/<case_id>', methods=['PUT'])
    def update_case(case_id):
        """Update a case"""
        logger.info(f"PUT /cases/{case_id} - Updating case")
        try:
            # Validate ObjectId
            try:
                obj_id = ObjectId(case_id)
            except bson_errors.InvalidId:
                logger.warning(f"Invalid case ID format: {case_id}")
                return jsonify({'error': 'Invalid case ID format'}), 400
                
            data = request.json
            if not data:
                logger.warning("No JSON data in request")
                return jsonify({'error': 'No data provided'}), 400
                
            logger.debug(f"Update data: {data}")
            data['update_time'] = datetime.now()
            
            # Remove id if present and don't update create_time
            data.pop('id', None)
            data.pop('_id', None)
            data.pop('create_time', None)
            data.pop('case_number', None)  # Don't update case number
            
            result = db.cases.update_one(
                {'_id': obj_id},
                {'$set': data}
            )
            
            if result.matched_count == 0:
                logger.warning(f"Case not found for update: {case_id}")
                return jsonify({'error': 'Case not found'}), 404
                
            logger.info(f"Case updated: {case_id}, modified count: {result.modified_count}")
                
            # Return updated case
            case = db.cases.find_one({'_id': obj_id})
            case['id'] = str(case.pop('_id'))
            
            return jsonify(case)
            
        except Exception as e:
            logger.error(f"Error updating case {case_id}: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({'error': str(e)}), 500
    
    @case_bp.route('/<case_id>/documents', methods=['POST'])
    def upload_document(case_id):
        """Upload document to a case and process with OCR"""
        logger.info(f"POST /cases/{case_id}/documents - Uploading document")
        try:
            # Validate ObjectId
            try:
                obj_id = ObjectId(case_id)
            except bson_errors.InvalidId:
                logger.warning(f"Invalid case ID format: {case_id}")
                return jsonify({'error': 'Invalid case ID format'}), 400
                
            # Check if case exists
            case = db.cases.find_one({'_id': obj_id})
            if not case:
                logger.warning(f"Case not found: {case_id}")
                return jsonify({'error': 'Case not found'}), 404
                
            if 'file' not in request.files:
                logger.warning("No file in request")
                return jsonify({'error': 'No file provided'}), 400
                
            file = request.files['file']
            if not file.filename:
                logger.warning("Empty filename")
                return jsonify({'error': 'No file selected'}), 400
                
            logger.info(f"File upload: {file.filename}, content type: {file.content_type}")
                
            if not allowed_file(file.filename, config.ALLOWED_EXTENSIONS):
                logger.warning(f"File type not allowed: {file.filename}")
                return jsonify({'error': f"File type not allowed. Allowed types: {', '.join(config.ALLOWED_EXTENSIONS)}"}), 400
                
            # Create document ID early to use in path names
            doc_id = str(uuid.uuid4())
            
            # Create storage directory structure: UPLOAD_FOLDER/case_id/doc_id
            doc_storage_dir = Path(config.UPLOAD_FOLDER) / case_id / doc_id
            doc_storage_dir.mkdir(parents=True, exist_ok=True)
            logger.debug(f"Created document storage directory: {doc_storage_dir}")
            
            # Create pages directory for multi-page documents
            pages_dir = doc_storage_dir / "pages"
            pages_dir.mkdir(exist_ok=True)
            
            # Save original file
            original_filename = secure_filename(file.filename)
            original_file_path = doc_storage_dir / original_filename
            file.save(original_file_path)
            logger.debug(f"Saved original file to: {original_file_path}")
            
            # Process file with OCR
            logger.info(f"Starting OCR processing for file: {original_filename}")
            
            # Process according to file type
            is_pdf = original_filename.lower().endswith('.pdf')
            
            if is_pdf:
                logger.debug("Processing as PDF")
                # For PDF, pages will be saved to the pages directory
                pages_data = ocr_processor.process_pdf(original_file_path, pages_dir)
            else:
                logger.debug("Processing as image")
                # For single images, process and save preview to pages directory
                pages_data = ocr_processor.process_image(original_file_path)
                
                # Save preview image if it's in base64 format
                if pages_data and len(pages_data) > 0 and 'preview' in pages_data[0]:
                    preview_data = pages_data[0]['preview']
                    if preview_data.startswith('data:image/jpeg;base64,'):
                        preview_data = preview_data.split(',', 1)[1]
                        preview_path = pages_dir / "page_1.jpg"
                        with open(preview_path, 'wb') as f:
                            f.write(base64.b64decode(preview_data))
                        logger.debug(f"Saved single image preview to: {preview_path}")
                        # Update preview URL in the data
                        pages_data[0]['preview'] = f"/uploads/{case_id}/{doc_id}/pages/page_1.jpg"
            
            logger.info(f"OCR processing complete, extracted {len(pages_data)} pages")
            
            # Create page references for all pages
            page_urls = []
            for i, page_data in enumerate(pages_data, 1):
                # Update page URLs for all pages
                page_url = f"/uploads/{case_id}/{doc_id}/pages/page_{i}.jpg"
                
                # Update the preview URL in the data
                page_data['preview'] = page_url
                
                # Add to page URLs list
                page_urls.append({
                    'page_number': i,
                    'url': page_url
                })
            
            # Extract text from all pages
            raw_text = '\n'.join([page.get('raw', '') for page in pages_data])
            
            # Save raw text to file
            raw_text_path = doc_storage_dir / "raw_text.txt"
            with open(raw_text_path, 'w', encoding='utf-8') as f:
                f.write(raw_text)
            logger.debug(f"Saved raw text to: {raw_text_path}")
            
            # Save OCR data to file
            ocr_data_path = doc_storage_dir / "ocr_data.json"
            ocr_data = {
                'is_pdf': is_pdf,
                'total_pages': len(pages_data),
                'pages': pages_data
            }
            
            with open(ocr_data_path, 'w', encoding='utf-8') as f:
                json.dump(ocr_data, f, ensure_ascii=False)
            logger.debug(f"Saved OCR data to: {ocr_data_path}")
            
            # Analyze text if requested
            ai_analysis = None
            analyze_param = request.form.get('analyze', 'false').lower()
            if analyze_param == 'true':
                logger.info("Starting AI analysis of document text")
                try:
                    ai_analysis = document_analyzer.analyze_text(raw_text)
                    
                    # Save analysis results
                    if ai_analysis:
                        analysis_path = doc_storage_dir / "analysis.txt"
                        with open(analysis_path, 'w', encoding='utf-8') as f:
                            f.write(ai_analysis)
                        logger.debug(f"Saved AI analysis to: {analysis_path}")
                except Exception as analysis_error:
                    logger.error(f"AI analysis error: {str(analysis_error)}")
                    logger.error(traceback.format_exc())
                    # Continue without analysis result
            
            # Create document record for database with file paths
            document = {
                'id': doc_id,
                'filename': original_filename,
                'file_type': file.content_type,
                'upload_time': datetime.now(),
                'document_type': request.form.get('document_type', '待分类'),
                'preview_url': page_urls[0]['url'] if page_urls else None,  # First page as preview
                'storage_path': str(doc_storage_dir),
                'raw_text_sample': raw_text[:500] if raw_text else "",
                'raw_text_length': len(raw_text) if raw_text else 0,
                'has_ai_analysis': bool(ai_analysis),
                'is_pdf': is_pdf,
                'total_pages': len(pages_data),
                'page_urls': page_urls  # Store all page URLs in MongoDB
            }
            
            # Add document to case
            logger.debug(f"Adding document reference to case: {case_id}")
            update_result = db.cases.update_one(
                {'_id': obj_id},
                {
                    '$push': {'documents': document},
                    '$set': {'update_time': datetime.now()}
                }
            )
            
            logger.info(f"Document added to case, modified: {update_result.modified_count}")
            
            # For the response, include metadata and first page info
            response_data = {
                'document': document,
                'first_page': pages_data[0] if pages_data else None
            }
            
            return jsonify(response_data)
            
        except Exception as e:
            logger.error(f"Error uploading document to case {case_id}: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({'error': str(e)}), 500
    
    @case_bp.route('/<case_id>/documents/<document_id>', methods=['GET'])
    def get_document(case_id, document_id):
        """Get document details with OCR data"""
        logger.info(f"GET /cases/{case_id}/documents/{document_id} - Retrieving document")
        try:
            # Get query parameters
            include_ocr = request.args.get('include_ocr', 'false').lower() == 'true'
            include_raw_text = request.args.get('include_raw_text', 'false').lower() == 'true'
            
            # Validate ObjectId
            try:
                obj_id = ObjectId(case_id)
            except bson_errors.InvalidId:
                logger.warning(f"Invalid case ID format: {case_id}")
                return jsonify({'error': 'Invalid case ID format'}), 400
                
            # Find case with document
            case = db.cases.find_one({
                '_id': obj_id,
                'documents.id': document_id
            })
            
            if not case:
                logger.warning(f"Document not found: case_id={case_id}, document_id={document_id}")
                return jsonify({'error': 'Document not found'}), 404
                
            # Extract document from case
            document = next((doc for doc in case['documents'] if doc['id'] == document_id), None)
            logger.debug(f"Found document: {document_id}")
            
            # Make a copy to avoid modifying the original
            response_doc = document.copy()
            
            # If storage path exists, load additional data as requested
            if 'storage_path' in document:
                storage_path = Path(document['storage_path'])
                
                if include_ocr:
                    # Load OCR data
                    ocr_path = storage_path / "ocr_data.json"
                    if ocr_path.exists():
                        logger.debug(f"Loading OCR data from: {ocr_path}")
                        try:
                            with open(ocr_path, 'r', encoding='utf-8') as f:
                                response_doc['ocr_data'] = json.load(f)
                            logger.debug(f"OCR data loaded successfully")
                        except Exception as e:
                            logger.error(f"Error loading OCR data: {e}")
                            response_doc['ocr_data_error'] = str(e)
                    else:
                        logger.warning(f"OCR data file not found: {ocr_path}")
                        response_doc['ocr_data_error'] = "OCR data file not found"
                
                if include_raw_text:
                    # Load raw text
                    raw_text_path = storage_path / "raw_text.txt"
                    if raw_text_path.exists():
                        logger.debug(f"Loading raw text from: {raw_text_path}")
                        try:
                            with open(raw_text_path, 'r', encoding='utf-8') as f:
                                response_doc['raw_text'] = f.read()
                            logger.debug(f"Raw text loaded successfully")
                        except Exception as e:
                            logger.error(f"Error loading raw text: {e}")
                            response_doc['raw_text_error'] = str(e)
                    else:
                        logger.warning(f"Raw text file not found: {raw_text_path}")
                        response_doc['raw_text_error'] = "Raw text file not found"
                
                # Check for AI analysis
                if document.get('has_ai_analysis'):
                    analysis_path = storage_path / "analysis.txt"
                    if analysis_path.exists():
                        logger.debug(f"Loading AI analysis from: {analysis_path}")
                        try:
                            with open(analysis_path, 'r', encoding='utf-8') as f:
                                response_doc['ai_analysis'] = f.read()
                            logger.debug(f"AI analysis loaded successfully")
                        except Exception as e:
                            logger.error(f"Error loading AI analysis: {e}")
                            response_doc['ai_analysis_error'] = str(e)
            
            return jsonify(response_doc)
            
        except Exception as e:
            logger.error(f"Error getting document {document_id}: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({'error': str(e)}), 500
    
    @case_bp.route('/<case_id>/documents/<document_id>', methods=['PUT'])
    def update_document(case_id, document_id):
        """Update document metadata or processed text"""
        logger.info(f"PUT /cases/{case_id}/documents/{document_id} - Updating document")
        try:
            # Validate ObjectId
            try:
                obj_id = ObjectId(case_id)
            except bson_errors.InvalidId:
                logger.warning(f"Invalid case ID format: {case_id}")
                return jsonify({'error': 'Invalid case ID format'}), 400
                
            data = request.json
            if not data:
                logger.warning("No JSON data in request")
                return jsonify({'error': 'No data provided'}), 400
                
            logger.debug(f"Update data: {data}")
            
            # Update only allowed fields
            allowed_fields = ['document_type', 'processed_text']
            update_data = {f'documents.$.{k}': v for k, v in data.items() if k in allowed_fields}
            
            if not update_data:
                logger.warning(f"No valid fields to update. Allowed fields: {allowed_fields}")
                return jsonify({'error': 'No valid fields to update'}), 400
                
            update_data['update_time'] = datetime.now()
            
            result = db.cases.update_one(
                {
                    '_id': obj_id,
                    'documents.id': document_id
                },
                {'$set': update_data}
            )
            
            if result.matched_count == 0:
                logger.warning(f"Document not found for update: case_id={case_id}, document_id={document_id}")
                return jsonify({'error': 'Document not found'}), 404
                
            logger.info(f"Document updated: {document_id}, modified count: {result.modified_count}")
                
            # Get updated document
            case = db.cases.find_one({
                '_id': obj_id,
                'documents.id': document_id
            })
            
            document = next((doc for doc in case['documents'] if doc['id'] == document_id), None)
            return jsonify(document)
            
        except Exception as e:
            logger.error(f"Error updating document {document_id}: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({'error': str(e)}), 500
    
    return case_bp