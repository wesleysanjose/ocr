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

    # OCR configuration
    OCR_ENGINE = 'paddle'  # Which OCR engine to use
    OCR_LANG = 'ch'
    USE_ANGLE_CLS = True

    # MongoDB configuration
    MONGODB_URI = "mongodb://epyc:27017"
    MONGODB_DB_NAME = "forensic_system"
    MONGODB_OPTIONS = {
        "serverSelectionTimeoutMS": 5000,
        "connectTimeoutMS": 10000
    }

    # API configuration
    AI_API_BASE_URL = "http://10.0.0.100:5000/v1"
    AI_API_KEY = "not-needed"

class DevelopmentConfig(Config):
    DEBUG = True
    MONGODB_URI = "mongodb://epyc:27017"
    MONGODB_DB_NAME = "forensic_system_dev"

class ProductionConfig(Config):
    DEBUG = False
    KEEP_FILES = False
    MONGODB_URI = os.environ.get('MONGO_URL', 'mongodb://epyc:27017')
    MONGODB_DB_NAME = os.environ.get('MONGO_DB_NAME', 'forensic_system')
    # Add any additional production MongoDB options
    MONGODB_OPTIONS = {
        **Config.MONGODB_OPTIONS,
        "ssl": os.environ.get('MONGO_SSL', 'false').lower() == 'true',
        "authSource": os.environ.get('MONGO_AUTH_SOURCE', 'admin')
    }

class TestingConfig(Config):
    TESTING = True
    UPLOAD_FOLDER = BASE_DIR / 'test_uploads'
    MONGODB_URI = "mongodb://epyc:27017"
    MONGODB_DB_NAME = "forensic_system_test"

# Select configuration based on environment
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

active_config = config[os.getenv('FLASK_ENV', 'default')]()