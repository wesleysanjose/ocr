from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
from paddleocr import PaddleOCR
import pdf2image
from PIL import Image
import logging
import numpy as np

app = Flask(__name__)
CORS(app)

# Configure logging
LOG_FILE = 'ocr_app.log'

# Ensure log directory exists
os.makedirs(os.path.dirname(LOG_FILE) if os.path.dirname(LOG_FILE) else '.', exist_ok=True)

# Create formatter
formatter = logging.Formatter(
    '[%(asctime)s] [%(levelname)8s] %(filename)s:%(lineno)d - %(message)s',
    '%Y-%m-%d %H:%M:%S'
)

# Create and configure file handler
file_handler = logging.FileHandler(LOG_FILE, mode='a', encoding='utf-8')
file_handler.setFormatter(formatter)
file_handler.setLevel(logging.DEBUG)

# Create and configure console handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
console_handler.setLevel(logging.DEBUG)

# Configure root logger
root_logger = logging.getLogger()
root_logger.setLevel(logging.DEBUG)
root_logger.addHandler(file_handler)
root_logger.addHandler(console_handler)

# Get logger for this module
logger = logging.getLogger(__name__)

# Log startup message
logger.info("="*50)
logger.info("Starting OCR Application")
logger.info("="*50)

# Log startup configuration
logger.info("Starting OCR Application with configuration:")


# Configuration
UPLOAD_FOLDER = 'uploads'
KEEP_FILES = True  # Set to True to keep uploaded files
# Check if PDF support is available
try:
    import pdf2image
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
    PDF_SUPPORT = True
    logger.info("PDF support enabled (pdf2image and poppler found)")
except ImportError:
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    PDF_SUPPORT = False
    logger.info("PDF support disabled (pdf2image or poppler not found)")

# Ensure upload directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    logger.info(f"Created upload directory: {UPLOAD_FOLDER}")
logger.info(f"Upload directory: {os.path.abspath(UPLOAD_FOLDER)}")

MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
logger.info(f"Upload folder: {UPLOAD_FOLDER}")
logger.info(f"Allowed extensions: {ALLOWED_EXTENSIONS}")
logger.info(f"Max content length: {MAX_CONTENT_LENGTH} bytes")
# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize PaddleOCR
ocr = PaddleOCR(use_angle_cls=True, lang='ch')  # Change lang as needed

def allowed_file(filename: str) -> bool:
    """Check if the file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

class OCRProcessor:
    @staticmethod
    def process_image(image_path: str):
        """
        Process a single image with PaddleOCR.
        Returns tuple of (structured_data, raw_text)
        """
        try:
            logger.info(f"Starting OCR processing for image: {image_path}")
            logger.debug(f"Image file size: {os.path.getsize(image_path)} bytes")
            
            # Run OCR
            logger.debug("Initiating PaddleOCR processing")
            result = ocr.ocr(image_path, cls=True)
            logger.info(f"OCR processing completed. Found {len(result)} result blocks")
            
            structured_data = []
            raw_text = []

            total_lines = 0
            for idx in range(len(result)):
                res = result[idx]
                logger.debug(f"Processing result block {idx+1}/{len(result)}")
                for line in res:
                    if len(line) >= 2:  # Ensure we have both bbox and text result
                        coords = line[0]  # This is the bounding box coordinates
                        text = line[1][0]  # The recognized text
                        confidence = float(line[1][1])  # Confidence score
                        
                        logger.debug(f"Line {total_lines + 1}:")
                        logger.debug(f"  Text: {text}")
                        logger.debug(f"  Confidence: {confidence:.2f}")
                        logger.debug(f"  Coordinates: {coords}")
                        total_lines += 1
                        
                        # Format coordinates to match frontend expectations
                        structured_data.append([
                            coords,  # Already in format [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
                            [text, confidence]
                        ])
                        raw_text.append(text)

            return structured_data, '\n'.join(raw_text)
            
        except Exception as e:
            logger.error(f"OCR processing error: {str(e)}")
            raise

from openai import OpenAI

# Initialize OpenAI client with local endpoint
client = OpenAI(
    base_url="http://10.0.0.100:5000/v1",  # Local OpenAI-compatible API endpoint
    api_key="not-needed"  # API key can be any string since we're using local server
)

class DocumentAnalyzer:
    @staticmethod
    def analyze_text(text: str) -> str:
        """
        Analyze the OCR text using local OpenAI-compatible API.
        Returns analysis results as string.
        """
        try:
            logger.info("Starting AI analysis")
            logger.debug(f"Input text length: {len(text)}")

            # Prepare the prompt
            prompt = f"""based on the scanned ocr text, form a human readable person medical record in two column
            
OCR Text:
{text}"""

            # Call the API
            logger.debug("Calling OpenAI API")
            completion = client.chat.completions.create(
                model="any-model",  # Model name doesn't matter for local API
                messages=[
                    {"role": "system", "content": "You are a medical record formatter."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0
            )

            # Extract the response
            analysis = completion.choices[0].message.content
            logger.info("AI analysis completed successfully")
            logger.debug(f"Analysis length: {len(analysis)}")

            return analysis

        except Exception as e:
            logger.error(f"AI analysis error: {str(e)}", exc_info=True)
            raise

@app.route('/')
def index():
    """Render the main application page."""
    return render_template('index.html')

@app.route('/api/ocr', methods=['POST'])
def ocr_endpoint():
    """Handle OCR processing requests."""
    logger.info("Received OCR request")
    logger.debug(f"Request headers: {dict(request.headers)}")
    
    if 'file' not in request.files:
        logger.error("No file in request")
        return jsonify({'error': 'No file provided'}), 400
        
    file = request.files['file']
    logger.info(f"Received file: {file.filename}")
    
    if file.filename == '':
        logger.error("Empty filename")
        return jsonify({'error': 'No file selected'}), 400
        
    if not allowed_file(file.filename):
        logger.error(f"Invalid file type: {file.filename}")
        return jsonify({'error': 'File type not allowed'}), 400
        
    logger.debug(f"Content type: {file.content_type}")
    logger.debug(f"File size: {request.content_length} bytes")
        
    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        if filename.lower().endswith('.pdf'):
            if not PDF_SUPPORT:
                logger.error("PDF file uploaded but PDF support is not enabled")
                return jsonify({
                    'error': 'PDF support is not enabled. To enable PDF support, install required packages:\n' +
                            'pip install pdf2image\n' +
                            'And install poppler:\n' +
                            '- Ubuntu/Debian: sudo apt-get install poppler-utils\n' +
                            '- MacOS: brew install poppler\n' +
                            'Or use image files (JPG, PNG) instead.'
                }), 400
                
            logger.info("Processing PDF file")
            try:
                # Convert PDF to images
                logger.debug("Converting PDF to images")
                images = pdf2image.convert_from_path(filepath)
                logger.info(f"PDF conversion completed. Got {len(images)} pages")
            except Exception as pdf_error:
                logger.error(f"PDF conversion failed: {str(pdf_error)}")
                if "Unable to get page count" in str(pdf_error):
                    return jsonify({
                        'error': 'PDF processing failed. Please ensure poppler is installed. ' +
                                'For Ubuntu/Debian: sudo apt-get install poppler-utils, ' +
                                'For MacOS: brew install poppler'
                    }), 500
                return jsonify({'error': f'PDF processing failed: {str(pdf_error)}'}), 500
            
            # Process first page for now
            temp_image_path = os.path.join(app.config['UPLOAD_FOLDER'], 'temp.jpg')
            logger.debug(f"Saving first page to temporary file: {temp_image_path}")
            images[0].save(temp_image_path, 'JPEG')
            
            logger.info("Processing converted PDF page")
            structured_data, raw_text = OCRProcessor.process_image(temp_image_path)
            
            logger.debug("Cleaning up temporary file")
            os.remove(temp_image_path)
            logger.info("PDF processing completed")
        else:
            structured_data, raw_text = OCRProcessor.process_image(filepath)
            
        # Clean up
        os.remove(filepath)
        
        return jsonify({
            'data': structured_data,
            'raw': raw_text
        })
        
    except Exception as e:
        logger.error(f"OCR processing error: {str(e)}")
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_endpoint():
    """Handle AI analysis requests."""
    if not request.json or 'text' not in request.json:
        return jsonify({'error': 'No text provided'}), 400
        
    try:
        analysis = DocumentAnalyzer.analyze_text(request.json['text'])
        return jsonify({'analysis': analysis})
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        return jsonify({'error': 'Failed to analyze text'}), 500

if __name__ == '__main__':

    # Run the application
    app.run(
        host='0.0.0.0',
        port=8000,
        debug=True,
        use_reloader=True,
        threaded=True
    )