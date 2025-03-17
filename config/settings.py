import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# App configuration
class Config:
    # Flask configuration
    DEBUG = True
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

    # API configuration
    AI_API_BASE_URL = "http://10.0.0.100:11434/v1"
    AI_API_KEY = "not-needed"

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    # Production-specific settings
    DEBUG = False
    KEEP_FILES = False

class TestingConfig(Config):
    TESTING = True
    UPLOAD_FOLDER = BASE_DIR / 'test_uploads'

# Select configuration based on environment
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

active_config = config[os.getenv('FLASK_ENV', 'default')]()