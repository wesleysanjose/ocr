from flask import Flask, render_template
from flask_cors import CORS
import os
from pathlib import Path

# Fix the import path to use settings.py at the root level
from settings import get_config
from models.case_store import CaseStore
from models.material_store import MaterialStore
from utils.logger import setup_logger
from core.ocr.factory import OCREngineFactory
from core.analyzer import DocumentAnalyzer
from api.routes import init_api

def create_app(config_name='default'):
    """Application factory"""
    app = Flask(__name__, static_url_path='', static_folder='static')
    
    # Load configuration using get_config from settings.py
    app_config = get_config(config_name)
    app.config.from_object(app_config)
    
    # Setup logging
    logger = setup_logger(app)
    
    # Initialize CORS
    CORS(app)
    
    # Ensure required directories exist
    Path(app.config['UPLOAD_FOLDER']).mkdir(parents=True, exist_ok=True)
    
    # Initialize core components
    ocr_engine = OCREngineFactory.create(app_config.OCR_ENGINE, app_config)
    document_analyzer = DocumentAnalyzer(app_config)

    # Initialize MongoDB stores
    case_store = CaseStore(
        mongo_uri=app_config.MONGODB_URI,
        db_name=app_config.MONGODB_DB_NAME
    )
    material_store = MaterialStore(
        mongo_uri=app_config.MONGODB_URI,
        db_name=app_config.MONGODB_DB_NAME
    )

    # Register blueprints
    api_bp = init_api(ocr_engine, document_analyzer, app_config)
    app.register_blueprint(api_bp, url_prefix='/api')
    
    @app.route('/')
    def index():
        return app.send_static_file('index.html')
    
    @app.route('/cases')
    def cases_page():
        """Render the case management page"""
        return render_template('case_management.html')
    
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