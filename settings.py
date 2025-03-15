import os
from pathlib import Path

# Base directory of the project
BASE_DIR = Path(__file__).resolve().parent

class BaseConfig:
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-for-development-only')
    DEBUG = False
    TESTING = False
    
    # MongoDB settings
    MONGODB_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/forensic_system')
    
    # File upload settings
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'tiff', 'tif', 'bmp'}
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB max upload
    KEEP_FILES = False  # Whether to keep temporary files after processing
    
    # OCR settings
    OCR_LANG = 'en'  # Default OCR language
    
    # Storage configuration
    STORAGE_CONFIG = {
        'type': 'local',
        'base_path': os.path.join(BASE_DIR, 'storage/files')
    }
    
    # OpenAI settings for document analysis
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
    OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4')


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    KEEP_FILES = True  # Keep temp files during development for debugging


class TestingConfig(BaseConfig):
    TESTING = True
    MONGODB_URI = 'mongodb://localhost:27017/forensic_system_test'
    STORAGE_CONFIG = {
        'type': 'memory'  # Use in-memory storage for testing
    }


class ProductionConfig(BaseConfig):
    # Use stronger secret key in production
    SECRET_KEY = os.environ.get('SECRET_KEY')
    
    # Use environment variables for sensitive configuration
    MONGODB_URI = os.environ.get('MONGODB_URI')
    
    # Can use S3 or other cloud storage in production
    STORAGE_CONFIG = {
        'type': os.environ.get('STORAGE_TYPE', 'local'),
        'base_path': os.environ.get('STORAGE_PATH', os.path.join(BASE_DIR, 'storage/files')),
        # Add S3 config if needed
        's3_bucket': os.environ.get('S3_BUCKET', ''),
        's3_region': os.environ.get('S3_REGION', ''),
        's3_access_key': os.environ.get('S3_ACCESS_KEY', ''),
        's3_secret_key': os.environ.get('S3_SECRET_KEY', '')
    }


# Configuration dictionary to map environment names to config classes
config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

# Get configuration based on environment
def get_config(config_name=None):
    if not config_name:
        config_name = os.environ.get('FLASK_ENV', 'default')
    return config_by_name.get(config_name, config_by_name['default'])