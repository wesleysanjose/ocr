# app.py
from flask import Flask
from flask_cors import CORS
import os
from pathlib import Path
import atexit

from config.settings import config
from utils.logger import setup_logger
from core.ocr.factory import OCREngineFactory
from core.analyzer import DocumentAnalyzer
from api.routes import init_api
from api.case_routes import init_case_api
from database import db
from flask import send_from_directory

def create_app(config_name='default'):
    """Application factory"""
    app = Flask(__name__, static_url_path='', static_folder='static')
    
    # Load configuration
    app_config = config[config_name]
    app.config.from_object(app_config)
    
    # Setup logging
    logger = setup_logger(app)
    
    # Initialize CORS
    CORS(app)

    # Connect to database synchronously
    db.connect_db()
    
    # Register a function to close the database connection when the application exits
    atexit.register(db.close_db)
    
    # Ensure required directories exist
    Path(app.config['UPLOAD_FOLDER']).mkdir(parents=True, exist_ok=True)
    
    # Initialize core components
    ocr_engine = OCREngineFactory.create(app_config.OCR_ENGINE, app_config)
    document_analyzer = DocumentAnalyzer(app_config)

    # Register blueprints
    api_bp = init_api(ocr_engine, document_analyzer, app_config)
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Register case management routes with the /api prefix
    case_bp = init_case_api(db.db, ocr_engine, document_analyzer, app_config)
    app.register_blueprint(case_bp, url_prefix='/api/cases')

    @app.route('/')
    def index():
        return app.send_static_file('index.html')
    
    @app.route('/uploads/<path:filename>')
    def serve_upload(filename):
        """Serve uploaded files"""
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    return app

def main():
    """Main entry point"""
    env = os.getenv('FLASK_ENV', 'default')
    app = create_app(env)
    
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 8000)),
        debug=env == 'development',
        use_reloader=env == 'development',
        threaded=True
    )

if __name__ == '__main__':
    main();