# api/routes.py

from flask import Blueprint, request, jsonify, send_file
import logging
import json
import io
import uuid
from pathlib import Path
from werkzeug.utils import secure_filename
import tempfile
import os
from bson import ObjectId

from core.database import MongoDB
from core.documents.processor import DocumentProcessor
from core.analyzer import DocumentAnalyzer
from models import Case, Client, Document, Report
from utils.helpers import create_upload_dir, allowed_file, cleanup_dir

logger = logging.getLogger(__name__)
bp = Blueprint('api', __name__)

def process_mongodb_doc(doc):
    """
    Process MongoDB document to make it JSON serializable
    
    Args:
        doc: MongoDB document or list of documents
        
    Returns:
        Document with ObjectId converted to string
    """
    if doc is None:
        return None
        
    if isinstance(doc, list):
        return [process_mongodb_doc(item) for item in doc]
        
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            # Convert _id to id
            if key == '_id':
                result['id'] = str(value)
            else:
                # Process nested documents
                if isinstance(value, (dict, list)):
                    result[key] = process_mongodb_doc(value)
                # Convert ObjectId values
                elif isinstance(value, ObjectId):
                    result[key] = str(value)
                else:
                    result[key] = value
        return result
        
    # Convert single ObjectId
    if isinstance(doc, ObjectId):
        return str(doc)
        
    return doc

def init_api(config):
    """Initialize API routes with dependencies"""
    
    # Initialize database and models
    db = MongoDB(config)
    db.connect()
    
    case_model = Case(db)
    client_model = Client(db)
    document_model = Document(db)
    report_model = Report(db)
    
    # Initialize document processor and analyzer
    document_processor = DocumentProcessor(config)
    document_analyzer = DocumentAnalyzer(config)
    
    # Helper function to validate tenant access
    def validate_tenant(tenant_id, required=True):
        """
        Validate tenant ID from request
        
        Args:
            tenant_id: Tenant ID to validate
            required: Whether tenant ID is required
            
        Returns:
            Client record if valid, None if not required and not provided
        """
        if not tenant_id:
            if required:
                return None
            return None
            
        # Validate tenant ID
        client = client_model.get(tenant_id)
        if not client:
            return None
            
        return client
    
    # ===== Client/Tenant Endpoints =====
    
    @bp.route('/clients', methods=['GET'])
    def list_clients():
        """List clients/tenants"""
        try:
            # Get query parameters
            status = request.args.get('status')
            limit = int(request.args.get('limit', 50))
            skip = int(request.args.get('skip', 0))
            
            # List clients
            clients = client_model.list(
                status=status,
                limit=limit,
                skip=skip
            )
            
            # Process MongoDB documents
            processed_clients = process_mongodb_doc(clients)
            
            return jsonify({
                'clients': processed_clients,
                'count': len(clients),
                'total': len(clients)  # This should be updated to get actual total count
            }), 200
            
        except Exception as e:
            logger.error(f"Failed to list clients: {e}", exc_info=True)
            return jsonify({'error': 'Failed to list clients'}), 500
    
    @bp.route('/clients', methods=['POST'])
    def create_client():
        """Create a new client/tenant"""
        try:
            data = request.json
            
            # Create client
            client_id = client_model.create(
                name=data.get('name'),
                contact_email=data.get('contact_email'),
                contact_name=data.get('contact_name'),
                contact_phone=data.get('contact_phone'),
                settings=data.get('settings'),
                created_by=data.get('created_by')
            )
            
            return jsonify({'id': client_id, 'message': 'Client created successfully'}), 201
            
        except Exception as e:
            logger.error(f"Failed to create client: {e}", exc_info=True)
            return jsonify({'error': 'Failed to create client'}), 500
    
    @bp.route('/clients/<client_id>', methods=['GET'])
    def get_client(client_id):
        """Get client/tenant details"""
        try:
            # Get client
            client = client_model.get(client_id)
            if not client:
                return jsonify({'error': 'Client not found'}), 404
            
            # Process MongoDB document    
            processed_client = process_mongodb_doc(client)
                
            return jsonify(processed_client), 200
            
        except Exception as e:
            logger.error(f"Failed to get client {client_id}: {e}", exc_info=True)
            return jsonify({'error': 'Failed to get client'}), 500
    
    # ===== Case Endpoints =====
    
    @bp.route('/cases', methods=['POST'])
    def create_case():
        """Create a new case"""
        try:
            data = request.json
            
            # Validate tenant
            tenant_id = data.get('tenant_id')
            client = validate_tenant(tenant_id)
            if not client:
                return jsonify({'error': 'Invalid tenant ID'}), 403
                
            # Create case
            case_id = case_model.create(
                tenant_id=tenant_id,
                case_number=data.get('case_number') or f"CASE-{uuid.uuid4().hex[:8].upper()}",
                title=data.get('title'),
                description=data.get('description'),
                tags=data.get('tags'),
                status=data.get('status', 'open'),
                created_by=data.get('created_by')
            )
            
            return jsonify({'id': case_id, 'message': 'Case created successfully'}), 201
            
        except Exception as e:
            logger.error(f"Failed to create case: {e}", exc_info=True)
            return jsonify({'error': 'Failed to create case'}), 500
    
    @bp.route('/cases/<case_id>', methods=['GET'])
    def get_case(case_id):
        """Get case details"""
        try:
            tenant_id = request.args.get('tenant_id')
            
            # Validate tenant
            client = validate_tenant(tenant_id)
            if not client:
                return jsonify({'error': 'Invalid tenant ID'}), 403
                
            # Get case
            case = case_model.get(case_id, tenant_id)
            if not case:
                return jsonify({'error': 'Case not found'}), 404
            
            # Process MongoDB document
            processed_case = process_mongodb_doc(case)
                
            return jsonify(processed_case), 200
            
        except Exception as e:
            logger.error(f"Failed to get case {case_id}: {e}", exc_info=True)
            return jsonify({'error': 'Failed to get case'}), 500
    
    @bp.route('/cases', methods=['GET'])
    def list_cases():
        """List cases for a tenant"""
        try:
            tenant_id = request.args.get('tenant_id')
            
            # Validate tenant
            client = validate_tenant(tenant_id)
            if not client:
                return jsonify({'error': 'Invalid tenant ID'}), 403
                
            # Get query parameters
            status = request.args.get('status')
            tags = request.args.getlist('tags')
            search = request.args.get('search')
            limit = int(request.args.get('limit', 50))
            skip = int(request.args.get('skip', 0))
            sort_by = request.args.get('sort_by', 'created_at')
            sort_dir = int(request.args.get('sort_dir', -1))
            
            # List cases
            cases = case_model.list(
                tenant_id=tenant_id,
                status=status,
                tags=tags if tags else None,
                search=search,
                limit=limit,
                skip=skip,
                sort_by=sort_by,
                sort_dir=sort_dir
            )
            
            # Process MongoDB documents
            processed_cases = process_mongodb_doc(cases)
            
            return jsonify({
                'cases': processed_cases,
                'count': len(cases),
                'total': len(cases)  # This should be updated to get actual total count
            }), 200
            
        except Exception as e:
            logger.error(f"Failed to list cases: {e}", exc_info=True)
            return jsonify({'error': 'Failed to list cases'}), 500
    
    @bp.route('/cases/<case_id>', methods=['PUT'])
    def update_case(case_id):
        """Update a case"""
        try:
            data = request.json
            
            # Validate tenant
            tenant_id = data.get('tenant_id')
            client = validate_tenant(tenant_id)
            if not client:
                return jsonify({'error': 'Invalid tenant ID'}), 403
                
            # Update case
            success = case_model.update(case_id, tenant_id, data)
            if not success:
                return jsonify({'error': 'Case not found or not updated'}), 404
                
            return jsonify({'message': 'Case updated successfully'}), 200
            
        except Exception as e:
            logger.error(f"Failed to update case {case_id}: {e}", exc_info=True)
            return jsonify({'error': 'Failed to update case'}), 500
    
    @bp.route('/cases/<case_id>', methods=['DELETE'])
    def delete_case(case_id):
        """Delete a case"""
        try:
            tenant_id = request.args.get('tenant_id')
            
            # Validate tenant
            client = validate_tenant(tenant_id)
            if not client:
                return jsonify({'error': 'Invalid tenant ID'}), 403
                
            # Delete case
            success = case_model.delete(case_id, tenant_id)
            if not success:
                return jsonify({'error': 'Case not found or not deleted'}), 404
                
            return jsonify({'message': 'Case deleted successfully'}), 200
            
        except Exception as e:
            logger.error(f"Failed to delete case {case_id}: {e}", exc_info=True)
            return jsonify({'error': 'Failed to delete case'}), 500
    
    # ===== Document Endpoints =====
    
    @bp.route('/documents', methods=['POST'])
    def upload_document():
        """Upload a document for a case"""
        try:
            # Validate tenant and case
            tenant_id = request.form.get('tenant_id')
            case_id = request.form.get('case_id')
            
            client = validate_tenant(tenant_id)
            if not client:
                return jsonify({'error': 'Invalid tenant ID'}), 403
                
            # Check if case exists
            case = case_model.get(case_id, tenant_id)
            if not case:
                return jsonify({'error': 'Case not found'}), 404
                
            # Check if file was provided
            if 'file' not in request.files:
                return jsonify({'error': 'No file provided'}), 400
                
            file = request.files['file']
            if not file.filename:
                return jsonify({'error': 'No file selected'}), 400
                
            if not allowed_file(file.filename, config.ALLOWED_EXTENSIONS):
                return jsonify({'error': 'File type not allowed'}), 400
            
            # Process document
            filename = secure_filename(file.filename)
            metadata = {
                'original_filename': filename,
                'description': request.form.get('description', ''),
                'tags': json.loads(request.form.get('tags', '[]')),
                'created_by': request.form.get('created_by')
            }
            
            result = document_processor.process_document(
                file_obj=file,
                filename=filename,
                tenant_id=tenant_id,
                case_id=case_id,
                document_metadata=metadata
            )
            
            # Create document record in database
            document_id = document_model.create(
                tenant_id=tenant_id,
                case_id=case_id,
                filename=filename,
                document_type=result['document_type'],
                storage_paths={
                    'original': result['original_path'],
                    'base_path': f"tenants/{tenant_id}/cases/{case_id}/documents/{result['document_id']}"
                },
                page_count=len(result['pages']),
                ocr_status='complete',
                metadata=metadata,
                created_by=request.form.get('created_by')
            )
            
            # Add document to case
            case_model.add_document(
                case_id=case_id,
                tenant_id=tenant_id,
                document_id=document_id,
                document_metadata={
                    'filename': filename,
                    'document_type': result['document_type'],
                    'page_count': len(result['pages'])
                }
            )
            
            # Add page data to document
            for page in result['pages']:
                document_model.add_page_data(
                    document_id=document_id,
                    tenant_id=tenant_id,
                    page_number=page['page_number'],
                    page_data={
                        'image_path': page['image_path'],
                        'thumbnail_path': page['thumbnail_path'],
                        'text_path': page['text_path'],
                        'ocr_data': page['ocr_data']['raw']
                    }
                )
            
            return jsonify({
                'document_id': document_id,
                'pages': len(result['pages']),
                'message': 'Document uploaded and processed successfully'
            }), 201
            
        except Exception as e:
            logger.error(f"Document upload failed: {e}", exc_info=True)
            return jsonify({'error': 'Document upload failed'}), 500
    
    @bp.route('/documents/<document_id>', methods=['GET'])
    def get_document(document_id):
        """Get document details"""
        try:
            tenant_id = request.args.get('tenant_id')
            
            # Validate tenant
            client = validate_tenant(tenant_id)
            if not client:
                return jsonify({'error': 'Invalid tenant ID'}), 403
                
            # Get document
            document = document_model.get(document_id, tenant_id)
            if not document:
                return jsonify({'error': 'Document not found'}), 404
            
            # Process MongoDB document
            processed_document = process_mongodb_doc(document)
                
            return jsonify(processed_document), 200
            
        except Exception as e:
            logger.error(f"Failed to get document {document_id}: {e}", exc_info=True)
            return jsonify({'error': 'Failed to get document'}), 500
    
    @bp.route('/cases/<case_id>/documents', methods=['GET'])
    def list_case_documents(case_id):
        """List documents for a case"""
        try:
            tenant_id = request.args.get('tenant_id')
            
            # Validate tenant
            client = validate_tenant(tenant_id)
            if not client:
                return jsonify({'error': 'Invalid tenant ID'}), 403
                
            # Check if case exists
            case = case_model.get(case_id, tenant_id)
            if not case:
                return jsonify({'error': 'Case not found'}), 404
                
            # Get documents
            limit = int(request.args.get('limit', 100))
            skip = int(request.args.get('skip', 0))
            
            documents = document_model.list_by_case(
                case_id=case_id,
                tenant_id=tenant_id,
                limit=limit,
                skip=skip
            )
            
            # Process MongoDB documents
            processed_documents = process_mongodb_doc(documents)
            
            return jsonify({
                'documents': processed_documents,
                'count': len(documents),
                'total': len(documents)  # This should be updated to get actual total count
            }), 200
            
        except Exception as e:
            logger.error(f"Failed to list documents for case {case_id}: {e}", exc_info=True)
            return jsonify({'error': 'Failed to list documents'}), 500
    
    @bp.route('/documents/<document_id>/preview', methods=['GET'])
    def get_document_preview(document_id):
        """Get document preview data"""
        try:
            tenant_id = request.args.get('tenant_id')
            case_id = request.args.get('case_id')
            page = int(request.args.get('page', 1))
            
            # Validate tenant
            client = validate_tenant(tenant_id)
            if not client:
                return jsonify({'error': 'Invalid tenant ID'}), 403
                
            # Get document
            document = document_model.get(document_id, tenant_id)
            if not document:
                return jsonify({'error': 'Document not found'}), 404
                
            # Get preview data
            preview = document_processor.get_document_preview(
                document_id=document_id,
                tenant_id=tenant_id,
                case_id=case_id,
                page=page
            )
            
            # Process any MongoDB objects
            processed_preview = process_mongodb_doc(preview)
            
            return jsonify(processed_preview), 200
            
        except Exception as e:
            logger.error(f"Failed to get document preview {document_id}: {e}", exc_info=True)
            return jsonify({'error': 'Failed to get document preview'}), 500
    
    @bp.route('/files/<path:file_path>', methods=['GET'])
    def get_file(file_path):
        """Get a file from storage"""
        try:
            # Get file from storage
            storage_provider = document_processor.storage
            file_obj = storage_provider.get_file(file_path)
            
            # Get metadata
            metadata = storage_provider.get_file_metadata(file_path)
            content_type = metadata.get('content_type', 'application/octet-stream')
            
            # Send file
            return send_file(
                io.BytesIO(file_obj.read()),
                mimetype=content_type,
                as_attachment=False,
                download_name=os.path.basename(file_path)
            )
            
        except FileNotFoundError:
            return jsonify({'error': 'File not found'}), 404
        except Exception as e:
            logger.error(f"Failed to get file {file_path}: {e}", exc_info=True)
            return jsonify({'error': 'Failed to get file'}), 500
    
    # ===== Report Endpoints =====
    
    @bp.route('/reports', methods=['POST'])
    def create_report():
        """Create a new report"""
        try:
            data = request.json
            
            # Validate tenant
            tenant_id = data.get('tenant_id')
            case_id = data.get('case_id')
            
            client = validate_tenant(tenant_id)
            if not client:
                return jsonify({'error': 'Invalid tenant ID'}), 403
                
            # Check if case exists
            case = case_model.get(case_id, tenant_id)
            if not case:
                return jsonify({'error': 'Case not found'}), 404
                
            # Create report
            report_id = report_model.create(
                tenant_id=tenant_id,
                case_id=case_id,
                title=data.get('title'),
                report_type=data.get('report_type'),
                content=data.get('content', {}),
                document_ids=data.get('document_ids', []),
                field_data=data.get('field_data', {}),
                status=data.get('status', 'draft'),
                created_by=data.get('created_by')
            )
            
            # Add report to case
            case_model.add_report(
                case_id=case_id,
                tenant_id=tenant_id,
                report_id=report_id,
                report_metadata={
                    'title': data.get('title'),
                    'report_type': data.get('report_type'),
                    'status': data.get('status', 'draft')
                }
            )
            
            return jsonify({'id': report_id, 'message': 'Report created successfully'}), 201
            
        except Exception as e:
            logger.error(f"Failed to create report: {e}", exc_info=True)
            return jsonify({'error': 'Failed to create report'}), 500
    
    @bp.route('/reports/<report_id>', methods=['GET'])
    def get_report(report_id):
        """Get report details"""
        try:
            tenant_id = request.args.get('tenant_id')
            
            # Validate tenant
            client = validate_tenant(tenant_id)
            if not client:
                return jsonify({'error': 'Invalid tenant ID'}), 403
                
            # Get report
            report = report_model.get(report_id, tenant_id)
            if not report:
                return jsonify({'error': 'Report not found'}), 404
            
            # Process MongoDB document
            processed_report = process_mongodb_doc(report)
                
            return jsonify(processed_report), 200
            
        except Exception as e:
            logger.error(f"Failed to get report {report_id}: {e}", exc_info=True)
            return jsonify({'error': 'Failed to get report'}), 500
    
    @bp.route('/cases/<case_id>/reports', methods=['GET'])
    def list_case_reports(case_id):
        """List reports for a case"""
        try:
            tenant_id = request.args.get('tenant_id')
            
            # Validate tenant
            client = validate_tenant(tenant_id)
            if not client:
                return jsonify({'error': 'Invalid tenant ID'}), 403
                
            # Check if case exists
            case = case_model.get(case_id, tenant_id)
            if not case:
                return jsonify({'error': 'Case not found'}), 404
                
            # Get reports
            status = request.args.get('status')
            limit = int(request.args.get('limit', 50))
            skip = int(request.args.get('skip', 0))
            
            reports = report_model.list_by_case(
                case_id=case_id,
                tenant_id=tenant_id,
                status=status,
                limit=limit,
                skip=skip
            )
            
            # Process MongoDB documents
            processed_reports = process_mongodb_doc(reports)
            
            return jsonify({
                'reports': processed_reports,
                'count': len(reports),
                'total': len(reports)  # This should be updated to get actual total count
            }), 200
            
        except Exception as e:
            logger.error(f"Failed to list reports for case {case_id}: {e}", exc_info=True)
            return jsonify({'error': 'Failed to list reports'}), 500
    
    @bp.route('/reports/<report_id>', methods=['PUT'])
    def update_report(report_id):
        """Update a report"""
        try:
            data = request.json
            
            # Validate tenant
            tenant_id = data.get('tenant_id')
            client = validate_tenant(tenant_id)
            if not client:
                return jsonify({'error': 'Invalid tenant ID'}), 403
                
            # Check for version creation
            create_version = data.pop('create_version', False)
            
            # Update report
            success = report_model.update(
                report_id=report_id,
                tenant_id=tenant_id,
                updates=data,
                create_version=create_version
            )
            
            if not success:
                return jsonify({'error': 'Report not found or not updated'}), 404
                
            return jsonify({'message': 'Report updated successfully'}), 200
            
        except Exception as e:
            logger.error(f"Failed to update report {report_id}: {e}", exc_info=True)
            return jsonify({'error': 'Failed to update report'}), 500
    
    @bp.route('/reports/<report_id>/analyze', methods=['POST'])
    def analyze_report(report_id):
        """Analyze a report for errors and inconsistencies"""
        try:
            data = request.json
            
            # Validate tenant
            tenant_id = data.get('tenant_id')
            client = validate_tenant(tenant_id)
            if not client:
                return jsonify({'error': 'Invalid tenant ID'}), 403
                
            # Get report
            report = report_model.get(report_id, tenant_id)
            if not report:
                return jsonify({'error': 'Report not found'}), 404
                
            # Get report content
            report_content = report.get('content', {})
            report_fields = report.get('field_data', {})
            
            # Prepare text for analysis
            if isinstance(report_content, dict):
                # Convert structured content to text
                analysis_text = json.dumps(report_content, indent=2)
            else:
                analysis_text = str(report_content)
                
            # Add field data
            if report_fields:
                field_text = "\n".join([f"{k}: {v}" for k, v in report_fields.items()])
                analysis_text += f"\n\nField Data:\n{field_text}"
                
            # Run analysis
            analysis_result = document_analyzer.analyze_text(analysis_text)
            
            # Parse analysis result
            try:
                analysis_data = json.loads(analysis_result)
            except json.JSONDecodeError:
                analysis_data = {
                    'raw_result': analysis_result,
                    'issues': [],
                    'recommendations': []
                }
                
            # Update report with analysis results
            report_model.update_analysis(
                report_id=report_id,
                tenant_id=tenant_id,
                analysis_results=analysis_data
            )
            
            return jsonify({
                'analysis': analysis_data,
                'message': 'Report analyzed successfully'
            }), 200
            
        except Exception as e:
            logger.error(f"Failed to analyze report {report_id}: {e}", exc_info=True)
            return jsonify({'error': 'Failed to analyze report'}), 500
    
    # Return the blueprint
    return bp