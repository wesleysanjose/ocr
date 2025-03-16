from flask import Blueprint, request, jsonify
import logging
from bson import ObjectId
from datetime import datetime
import uuid
import os
from pathlib import Path

# Import your OCR processor and document analyzer
from core.ocr.factory import OCREngineFactory
from core.analyzer import DocumentAnalyzer
from utils.helpers import create_upload_dir, allowed_file

logger = logging.getLogger(__name__)
case_bp = Blueprint('case', __name__, url_prefix='/cases')

def init_case_api(db, ocr_processor, document_analyzer, config):
    """Initialize case management API routes"""
    
    @case_bp.route('/', methods=['GET'])
    async def get_cases():
        """Get list of cases with optional filtering"""
        try:
            # Get query parameters
            status = request.args.get('status')
            skip = int(request.args.get('skip', 0))
            limit = int(request.args.get('limit', 20))
            
            # Build query
            query = {}
            if status and status != '全部':
                query['status'] = status
                
            # Execute query
            cursor = db.cases.find(query).sort('create_time', -1).skip(skip).limit(limit)
            cases = await cursor.to_list(length=limit)
            
            # Count total
            total = await db.cases.count_documents(query)
            
            # Process for JSON response
            for case in cases:
                case['id'] = str(case.pop('_id'))
                
            return jsonify({
                'cases': cases,
                'total': total,
                'page': skip // limit + 1,
                'pages': (total + limit - 1) // limit
            })
            
        except Exception as e:
            logger.error(f"Error getting cases: {e}")
            return jsonify({'error': str(e)}), 500
    
    @case_bp.route('/', methods=['POST'])
    async def create_case():
        """Create a new case"""
        try:
            data = request.json
            
            # Generate case number if not provided
            if 'case_number' not in data:
                prefix = "JD" + datetime.now().strftime("%Y%m")
                counter = await db.counters.find_one_and_update(
                    {'_id': 'case_number'},
                    {'$inc': {'seq': 1}},
                    upsert=True,
                    return_document=True
                )
                data['case_number'] = f"{prefix}{counter['seq']:03d}"
            
            # Set timestamps
            now = datetime.now()
            data['create_time'] = now
            data['update_time'] = now
            
            # Initialize empty documents list
            if 'documents' not in data:
                data['documents'] = []
                
            # Insert into database
            result = await db.cases.insert_one(data)
            
            # Return created case
            case = await db.cases.find_one({'_id': result.inserted_id})
            case['id'] = str(case.pop('_id'))
            
            return jsonify(case), 201
            
        except Exception as e:
            logger.error(f"Error creating case: {e}")
            return jsonify({'error': str(e)}), 500
    
    @case_bp.route('/<case_id>', methods=['GET'])
    async def get_case(case_id):
        """Get a single case by ID"""
        try:
            case = await db.cases.find_one({'_id': ObjectId(case_id)})
            if not case:
                return jsonify({'error': 'Case not found'}), 404
                
            case['id'] = str(case.pop('_id'))
            return jsonify(case)
            
        except Exception as e:
            logger.error(f"Error getting case {case_id}: {e}")
            return jsonify({'error': str(e)}), 500
    
    @case_bp.route('/<case_id>', methods=['PUT'])
    async def update_case(case_id):
        """Update a case"""
        try:
            data = request.json
            data['update_time'] = datetime.now()
            
            # Remove id if present and don't update create_time
            data.pop('id', None)
            data.pop('_id', None)
            data.pop('create_time', None)
            data.pop('case_number', None)  # Don't update case number
            
            result = await db.cases.update_one(
                {'_id': ObjectId(case_id)},
                {'$set': data}
            )
            
            if result.matched_count == 0:
                return jsonify({'error': 'Case not found'}), 404
                
            # Return updated case
            case = await db.cases.find_one({'_id': ObjectId(case_id)})
            case['id'] = str(case.pop('_id'))
            
            return jsonify(case)
            
        except Exception as e:
            logger.error(f"Error updating case {case_id}: {e}")
            return jsonify({'error': str(e)}), 500
    
    @case_bp.route('/<case_id>/documents', methods=['POST'])
    async def upload_document(case_id):
        """Upload document to a case and process with OCR"""
        try:
            # Check if case exists
            case = await db.cases.find_one({'_id': ObjectId(case_id)})
            if not case:
                return jsonify({'error': 'Case not found'}), 404
                
            if 'file' not in request.files:
                return jsonify({'error': 'No file provided'}), 400
                
            file = request.files['file']
            if not file.filename:
                return jsonify({'error': 'No file selected'}), 400
                
            if not allowed_file(file.filename, config.ALLOWED_EXTENSIONS):
                return jsonify({'error': 'File type not allowed'}), 400
                
            # Create upload directory
            upload_dir = create_upload_dir(Path(config.UPLOAD_FOLDER) / case_id)
            filename = str(uuid.uuid4()) + '_' + file.filename
            filepath = upload_dir / filename
            
            # Save file
            file.save(filepath)
            
            # Process file with OCR
            if filename.lower().endswith('.pdf'):
                pages_data = ocr_processor.process_pdf(filepath, upload_dir)
                is_pdf = True
            else:
                pages_data = ocr_processor.process_image(filepath)
                is_pdf = False
                
            # Combine text from all pages
            raw_text = '\n'.join([page['raw'] for page in pages_data])
            
            # Analyze text if requested
            ai_analysis = None
            if request.form.get('analyze', 'false').lower() == 'true':
                ai_analysis = document_analyzer.analyze_text(raw_text)
            
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
            await db.cases.update_one(
                {'_id': ObjectId(case_id)},
                {
                    '$push': {'documents': document},
                    '$set': {'update_time': datetime.now()}
                }
            )
            
            return jsonify({
                'document': document,
                'pages_data': pages_data
            })
            
        except Exception as e:
            logger.error(f"Error uploading document to case {case_id}: {e}", exc_info=True)
            return jsonify({'error': str(e)}), 500
    
    @case_bp.route('/<case_id>/documents/<document_id>', methods=['GET'])
    async def get_document(case_id, document_id):
        """Get document details"""
        try:
            case = await db.cases.find_one({
                '_id': ObjectId(case_id),
                'documents.id': document_id
            })
            
            if not case:
                return jsonify({'error': 'Document not found'}), 404
                
            document = next((doc for doc in case['documents'] if doc['id'] == document_id), None)
            return jsonify(document)
            
        except Exception as e:
            logger.error(f"Error getting document {document_id}: {e}")
            return jsonify({'error': str(e)}), 500
    
    @case_bp.route('/<case_id>/documents/<document_id>', methods=['PUT'])
    async def update_document(case_id, document_id):
        """Update document metadata or processed text"""
        try:
            data = request.json
            
            # Update only allowed fields
            allowed_fields = ['document_type', 'processed_text']
            update_data = {f'documents.$.{k}': v for k, v in data.items() if k in allowed_fields}
            update_data['update_time'] = datetime.now()
            
            result = await db.cases.update_one(
                {
                    '_id': ObjectId(case_id),
                    'documents.id': document_id
                },
                {'$set': update_data}
            )
            
            if result.matched_count == 0:
                return jsonify({'error': 'Document not found'}), 404
                
            # Get updated document
            case = await db.cases.find_one({
                '_id': ObjectId(case_id),
                'documents.id': document_id
            })
            
            document = next((doc for doc in case['documents'] if doc['id'] == document_id), None)
            return jsonify(document)
            
        except Exception as e:
            logger.error(f"Error updating document {document_id}: {e}")
            return jsonify({'error': str(e)}), 500
    
    return case_bp