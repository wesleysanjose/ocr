# case_routes.py
from flask import Blueprint, request, jsonify
import logging
import traceback
from bson import ObjectId, errors as bson_errors
from datetime import datetime
import uuid
import os
from pathlib import Path

# Import your OCR processor and document analyzer
from core.ocr.factory import OCREngineFactory
from core.analyzer import DocumentAnalyzer
from utils.helpers import create_upload_dir, allowed_file

logger = logging.getLogger(__name__)
case_bp = Blueprint('case', __name__)

def init_case_api(db, ocr_processor, document_analyzer, config):
    """Initialize case management API routes"""
    
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
                    
                logger.debug(f"File upload: {file.filename}, content type: {file.content_type}")
                    
                if not allowed_file(file.filename, config.ALLOWED_EXTENSIONS):
                    logger.warning(f"File type not allowed: {file.filename}")
                    return jsonify({'error': 'File type not allowed'}), 400
                    
                # Create upload directory
                upload_dir = create_upload_dir(Path(config.UPLOAD_FOLDER) / case_id)
                logger.debug(f"Created upload directory: {upload_dir}")
                
                filename = str(uuid.uuid4()) + '_' + file.filename
                filepath = upload_dir / filename
                
                # Save file
                logger.debug(f"Saving file to: {filepath}")
                file.save(filepath)
                
                # Process file with OCR
                logger.info(f"Starting OCR processing for file: {filename}")
                if filename.lower().endswith('.pdf'):
                    logger.debug("Processing as PDF")
                    pages_data = ocr_processor.process_pdf(filepath, upload_dir)
                    is_pdf = True
                else:
                    logger.debug("Processing as image")
                    pages_data = ocr_processor.process_image(filepath)
                    is_pdf = False
                    
                logger.info(f"OCR processing complete, extracted {len(pages_data)} pages")
                    
                # Combine text from all pages
                raw_text = '\n'.join([page['raw'] for page in pages_data])
                
                # Analyze text if requested
                ai_analysis = None
                analyze_param = request.form.get('analyze', 'false').lower()
                if analyze_param == 'true':
                    logger.info("Starting AI analysis of document text")
                    ai_analysis = document_analyzer.analyze_text(raw_text)
                    logger.debug("AI analysis complete")
                
                # Create document record
                document = {
                    'id': str(uuid.uuid4()),
                    'filename': file.filename,
                    'file_type': file.content_type,
                    'upload_time': datetime.now(),
                    'document_type': request.form.get('document_type', '待分类'),
                    'preview_url': pages_data[0]['preview'] if pages_data else None,
                    'ocr_data': {
                        'is_pdf': is_pdf,
                        'total_pages': len(pages_data),
                        'pages': pages_data
                    },
                    'raw_text': raw_text,
                    'ai_analysis': ai_analysis
                }
                
                # Add document to case
                logger.debug(f"Adding document to case: {case_id}")
                update_result = db.cases.update_one(
                    {'_id': obj_id},
                    {
                        '$push': {'documents': document},
                        '$set': {'update_time': datetime.now()}
                    }
                )
                
                logger.info(f"Document added to case, modified: {update_result.modified_count}")
                
                return jsonify({
                    'document': document,
                    'pages_data': pages_data
                })
                
            except Exception as e:
                logger.error(f"Error uploading document to case {case_id}: {str(e)}")
                logger.error(traceback.format_exc())
                return jsonify({'error': str(e)}), 500
        
        @case_bp.route('/<case_id>/documents/<document_id>', methods=['GET'])
        def get_document(case_id, document_id):
            """Get document details"""
            logger.info(f"GET /cases/{case_id}/documents/{document_id} - Retrieving document")
            try:
                # Validate ObjectId
                try:
                    obj_id = ObjectId(case_id)
                except bson_errors.InvalidId:
                    logger.warning(f"Invalid case ID format: {case_id}")
                    return jsonify({'error': 'Invalid case ID format'}), 400
                    
                case = db.cases.find_one({
                    '_id': obj_id,
                    'documents.id': document_id
                })
                
                if not case:
                    logger.warning(f"Document not found: case_id={case_id}, document_id={document_id}")
                    return jsonify({'error': 'Document not found'}), 404
                    
                document = next((doc for doc in case['documents'] if doc['id'] == document_id), None)
                logger.debug(f"Found document: {document_id}")
                return jsonify(document)
                
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