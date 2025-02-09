#!/bin/bash
# Production deployment script

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export FLASK_ENV=production
export SECRET_KEY=your-production-secret-key

# Run with gunicorn
gunicorn --bind 0.0.0.0:8000 \
         --workers 4 \
         --threads 2 \
         --timeout 120 \
         --access-logfile logs/access.log \
         --error-logfile logs/error.log \
         "app:create_app()"