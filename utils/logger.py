# utils/logger.py

import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
import os
from datetime import datetime

def setup_logger(app, log_level=None):
    """Configure application logging"""
    log_dir = Path(app.root_path) / 'logs'
    log_dir.mkdir(exist_ok=True)
    
    # Generate log filename with timestamp
    timestamp = datetime.now().strftime('%Y-%m-%d')
    log_file = log_dir / f'app_{timestamp}.log'

    formatter = logging.Formatter(
        '[%(asctime)s] [%(levelname)8s] %(filename)s:%(lineno)d - %(message)s',
        '%Y-%m-%d %H:%M:%S'
    )

    # File handler with rotation
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10485760,  # 10MB
        backupCount=10,
        encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    
    # Set log level from environment or default to DEBUG for development, INFO for production
    if log_level is None:
        log_level = getattr(logging, os.environ.get('LOG_LEVEL', 'DEBUG' if app.debug else 'INFO'))
    
    file_handler.setLevel(log_level)

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)

    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers to avoid duplicates
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
        
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)

    # Log startup information
    app.logger.info("="*50)
    app.logger.info(f"Starting Application in {app.env} mode")
    app.logger.info(f"Log level: {logging.getLevelName(log_level)}")
    app.logger.info("="*50)

    return root_logger