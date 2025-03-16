from flask import Flask
from flask_cors import CORS
import os
from pathlib import Path
import asyncio


from config.settings import config
from utils.logger import setup_logger
from core.ocr.factory import OCREngineFactory
from core.analyzer import DocumentAnalyzer
from api.routes import init_api
from api.case_routes import init_case_api
from database import db

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

    # Connect to database right away
    asyncio.run(db.connect_db())
    
    # Ensure required directories exist
    Path(app.config['UPLOAD_FOLDER']).mkdir(parents=True, exist_ok=True)
    
    # Initialize core components
    ocr_engine = OCREngineFactory.create(app_config.OCR_ENGINE, app_config)

    # ocr_processor = OCRProcessor(app_config)
    document_analyzer = DocumentAnalyzer(app_config)

    @app.teardown_appcontext
    def close_db_connection(exception):
        asyncio.run(db.close_db())

    # Register blueprints
    api_bp = init_api(ocr_engine, document_analyzer, app_config)
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Register case management routes - fix the URL prefix
    case_bp = init_case_api(db.db, ocr_engine, document_analyzer, app_config)
    app.register_blueprint(case_bp)  # Remove duplicate prefix since case_bp already has url_prefix='/cases'

    @app.route('/')
    def index():
        return app.send_static_file('index.html')
    
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
    main()