# config/settings.py

import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# App configuration
class Config:
    # Flask configuration
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-here')
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB

    # Upload configuration
    UPLOAD_FOLDER = BASE_DIR / 'uploads'
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
    KEEP_FILES = True
    
    # Temporary storage
    TEMP_DIR = BASE_DIR / 'temp'

    # OCR configuration
    OCR_ENGINE = 'paddle'
    OCR_LANG = 'ch'
    USE_ANGLE_CLS = True
    PDF_TO_IMAGE_DPI = 300

    # Storage configuration
    STORAGE_PROVIDER = 'local'  # 'local' or 's3'
    STORAGE_ROOT_DIR = BASE_DIR / 'storage'
    
    # S3 configuration
    S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'forensic-docs')
    AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    
    # MongoDB configuration
    MONGO_HOST = os.environ.get('MONGO_HOST', 'localhost')
    MONGO_PORT = int(os.environ.get('MONGO_PORT', 27017))
    MONGO_DB = os.environ.get('MONGO_DB', 'forensic_docs')
    MONGO_USERNAME = os.environ.get('MONGO_USERNAME')
    MONGO_PASSWORD = os.environ.get('MONGO_PASSWORD')
    MONGO_URI = os.environ.get('MONGO_URI')  # Optional: full connection URI

    # API configuration
    AI_API_BASE_URL = os.environ.get('AI_API_BASE_URL', "http://localhost:5000/v1")
    AI_API_KEY = os.environ.get('AI_API_KEY', "not-needed")


class DevelopmentConfig(Config):
    DEBUG = True
    MONGO_DB = 'forensic_docs_dev'


class ProductionConfig(Config):
    # Production-specific settings
    DEBUG = False
    KEEP_FILES = False
    STORAGE_PROVIDER = 's3'  # Use S3 in production


class TestingConfig(Config):
    TESTING = True
    UPLOAD_FOLDER = BASE_DIR / 'test_uploads'
    STORAGE_ROOT_DIR = BASE_DIR / 'test_storage'
    MONGO_DB = 'forensic_docs_test'


# Select configuration based on environment
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

active_config = config[os.getenv('FLASK_ENV', 'default')]()