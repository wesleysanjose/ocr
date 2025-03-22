# app.py

from flask import Flask
from flask_cors import CORS
import os
from pathlib import Path

from config.settings import config
from utils.logger import setup_logger
from core.database import MongoDB
from core.storage import StorageFactory
from api.routes import init_api

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
    
    # Ensure required directories exist
    Path(app.config['UPLOAD_FOLDER']).mkdir(parents=True, exist_ok=True)
    Path(app.config['STORAGE_ROOT_DIR']).mkdir(parents=True, exist_ok=True)
    Path(app.config['TEMP_DIR']).mkdir(parents=True, exist_ok=True)
    
    # Initialize database
    db = MongoDB(app_config)
    db.connect()
    
    # Initialize storage
    storage = StorageFactory.get_provider(app_config.STORAGE_PROVIDER, app_config)
    
    # Register blueprints
    api_bp = init_api(app_config)
    app.register_blueprint(api_bp, url_prefix='/api')
    
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