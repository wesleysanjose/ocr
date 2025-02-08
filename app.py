from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
import os
from paddleocr import PaddleOCR
import pdf2image
from PIL import Image
import logging
import numpy as np

app = Flask(__name__)

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
    base_url="http://localhost:5000/v1",  # Local OpenAI-compatible API endpoint
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

# HTML template (create templates/index.html)
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OCR Analyzer</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="min-h-screen bg-gray-50 p-4">
    <div class="grid grid-cols-3 gap-4">
        <!-- File Upload Section -->
        <div class="col-span-1">
            <div class="bg-white p-4 rounded-lg shadow">
                <h2 class="text-lg font-semibold mb-4">Document Upload</h2>
                <form id="upload-form">
                    <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <input type="file" id="file-upload" accept=".jpg,.jpeg,.png,.pdf" class="hidden">
                        <label for="file-upload" class="cursor-pointer text-blue-500 hover:text-blue-600">
                            <p>Click to upload or drag and drop</p>
                            <p class="text-sm text-gray-500">PDF or Images</p>
                        </label>
                    </div>
                </form>
                <div id="upload-status" class="mt-4 text-center hidden">
                    <p class="text-blue-500">Processing document...</p>
                </div>
                
                <!-- Image Preview Section -->
                <div id="preview-section" class="mt-4 hidden">
                    <h3 class="text-lg font-semibold mb-2">Preview</h3>
                    <div class="relative border rounded-lg p-2 bg-white">
                        <div class="overflow-auto" style="max-height: 400px;">
                            <div id="preview-container" class="relative">
                                <img id="preview-image" class="max-w-full transition-transform duration-200" src="" alt="Preview">
                            </div>
                        </div>
                        <div class="mt-2 flex justify-center gap-4 items-center">
                            <button id="zoom-out" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300">
                                <span class="text-lg">−</span>
                            </button>
                            <span id="zoom-level" class="px-3 py-1 bg-gray-100 rounded">100%</span>
                            <button id="zoom-in" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300">
                                <span class="text-lg">+</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- OCR Results Section -->
        <div class="col-span-1">
            <div class="bg-white p-4 rounded-lg shadow">
                <h2 class="text-lg font-semibold mb-4">OCR Results</h2>
                <textarea id="ocr-results" class="w-full h-32 p-2 border border-gray-300 rounded mb-2" readonly></textarea>
                <div id="ocr-viewer" class="border border-gray-200 rounded h-96 overflow-auto"></div>
            </div>
        </div>

        <!-- AI Analysis Section -->
        <div class="col-span-1">
            <div class="bg-white p-4 rounded-lg shadow">
                <h2 class="text-lg font-semibold mb-4">AI Analysis</h2>
                <button id="analyze-btn" class="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mb-4" disabled>
                    Analyze Text
                </button>
                <textarea id="analysis-results" class="w-full h-96 p-2 border border-gray-300 rounded" readonly></textarea>
            </div>
        </div>
    </div>

    <script>
        // File upload handling
        const uploadForm = document.getElementById('upload-form');
        const fileInput = document.getElementById('file-upload');
        const ocrResults = document.getElementById('ocr-results');
        const ocrViewer = document.getElementById('ocr-viewer');
        const analyzeBtn = document.getElementById('analyze-btn');
        const analysisResults = document.getElementById('analysis-results');
        const uploadStatus = document.getElementById('upload-status');

        // Preview and zoom functionality
        const previewSection = document.getElementById('preview-section');
        const previewImage = document.getElementById('preview-image');
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        const zoomLevelSpan = document.getElementById('zoom-level');
        let currentZoom = 100;

        function updateZoom() {
            previewImage.style.transform = `scale(${currentZoom / 100})`;
            previewImage.style.transformOrigin = 'top left';
            zoomLevelSpan.textContent = `${currentZoom}%`;
        }

        zoomInBtn.addEventListener('click', () => {
            currentZoom = Math.min(currentZoom + 25, 300);
            updateZoom();
        });

        zoomOutBtn.addEventListener('click', () => {
            currentZoom = Math.max(currentZoom - 25, 25);
            updateZoom();
        });

        fileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            // Show preview for image files
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImage.src = e.target.result;
                    previewSection.classList.remove('hidden');
                    currentZoom = 100;
                    updateZoom();
                };
                reader.readAsDataURL(file);
            } else {
                previewSection.classList.add('hidden');
            }

            // Create FormData
            const formData = new FormData();
            formData.append('file', file);

            try {
                // Show loading state
                uploadStatus.classList.remove('hidden');
                ocrResults.value = 'Processing...';
                ocrViewer.innerHTML = '<div class="p-4">Processing document...</div>';
                analyzeBtn.disabled = true;

                // Send file to OCR endpoint
                const response = await fetch('/api/ocr', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('OCR processing failed');
                }

                const result = await response.json();
                
                // Display raw text
                ocrResults.value = result.raw;

                // Display structured OCR data
                displayOCRData(result.data);

                // Enable analyze button
                analyzeBtn.disabled = false;

            } catch (error) {
                console.error('Upload error:', error);
                ocrResults.value = 'Error processing file. Please try again.';
                ocrViewer.innerHTML = '<div class="p-4 text-red-500">Error processing document</div>';
            } finally {
                uploadStatus.classList.add('hidden');
            }
        });

        // Handle AI analysis
        analyzeBtn.addEventListener('click', async () => {
            const text = ocrResults.value;
            if (!text) return;

            try {
                // Show loading state
                analyzeBtn.disabled = true;
                analyzeBtn.textContent = 'Analyzing...';
                analysisResults.value = 'Processing...';

                // Send text for analysis
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text })
                });

                if (!response.ok) {
                    throw new Error('Analysis failed');
                }

                const result = await response.json();
                analysisResults.value = result.analysis;

            } catch (error) {
                console.error('Analysis error:', error);
                analysisResults.value = 'Error analyzing text. Please try again.';
            } finally {
                analyzeBtn.disabled = false;
                analyzeBtn.textContent = 'Analyze Text';
            }
        });

        // Function to display OCR data with positions
        function displayOCRData(data) {
            if (!data || !data.length) {
                ocrViewer.innerHTML = '<div class="p-4">No OCR data available</div>';
                return;
            }

            // Clear previous content
            ocrViewer.innerHTML = '';

            // Create container for positioned elements
            const container = document.createElement('div');
            container.style.position = 'relative';
            container.style.width = '100%';
            container.style.height = '100%';

            // Calculate dimensions
            let maxX = 0;
            let maxY = 0;
            data.forEach(([coords]) => {
                coords.forEach(([x, y]) => {
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                });
            });

            // Set container size
            container.style.width = maxX + 'px';
            container.style.height = maxY + 'px';

            // Create text elements
            data.forEach(([coords, [text, confidence]], index) => {
                const element = document.createElement('div');
                element.textContent = text;
                element.style.position = 'absolute';
                
                // Calculate position (PaddleOCR coordinates are already in the correct format)
                const x = (coords[0][0] + coords[1][0]) / 2;
                const y = (coords[0][1] + coords[2][1]) / 2;
                
                element.style.left = x + 'px';
                element.style.top = y + 'px';
                element.style.transform = 'translate(-50%, -50%)';
                
                // Styling
                element.style.padding = '2px 4px';
                element.style.backgroundColor = `rgba(255, 255, 255, ${confidence})`;
                element.style.border = '1px solid rgba(0, 0, 0, 0.1)';
                element.style.borderRadius = '2px';
                element.style.cursor = 'text';
                element.title = `Confidence: ${(confidence * 100).toFixed(1)}%`;
                
                container.appendChild(element);
            });

            ocrViewer.appendChild(container);
        }
    </script>
</body>
</html>
"""

if __name__ == '__main__':
    # Save the HTML template
    os.makedirs('templates', exist_ok=True)
    with open('templates/index.html', 'w') as f:
        f.write(HTML_TEMPLATE)
    
    # Run the application
    app.run(
        host='0.0.0.0',
        port=8000,
        debug=True,
        use_reloader=True,
        threaded=True
    )