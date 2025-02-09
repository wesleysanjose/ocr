import logging
from openai import OpenAI

logger = logging.getLogger(__name__)

class DocumentAnalyzer:
    def __init__(self, config):
        self.client = OpenAI(
            base_url=config.AI_API_BASE_URL,
            api_key=config.AI_API_KEY
        )

    def analyze_text(self, text: str) -> str:
        """Analyze OCR text using AI"""
        try:
            logger.info("Starting AI analysis")
            prompt = self._create_prompt(text)
            
            completion = self.client.chat.completions.create(
                model="any-model",
                messages=[
                    {"role": "system", "content": "You are a medical record formatter."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0
            )
            
            return completion.choices[0].message.content

        except Exception as e:
            logger.error(f"AI analysis error: {e}", exc_info=True)
            raise

    @staticmethod
    def _create_prompt(text: str) -> str:
        """Create analysis prompt"""
        return f"""based on the scanned ocr text, form a human readable person medical record in two column
        
OCR Text:
{text}"""