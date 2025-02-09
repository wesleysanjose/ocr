import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler

def setup_logger(app):
    """Configure application logging"""
    log_dir = Path(app.root_path) / 'logs'
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / 'ocr_app.log'

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
    file_handler.setLevel(logging.DEBUG)

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.DEBUG if app.debug else logging.INFO)

    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)

    # Log startup information
    app.logger.info("="*50)
    app.logger.info("Starting OCR Application")
    app.logger.info("="*50)

    return root_logger