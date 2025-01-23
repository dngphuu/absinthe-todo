import os
import tempfile
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Base paths
    BASE_DIR = Path(__file__).parent
    TEMPLATE_FOLDER = os.path.join(BASE_DIR, 'templates')
    STATIC_FOLDER = os.path.join(BASE_DIR, 'static')
    
    # Cache settings
    CACHE_DIR = os.path.join(tempfile.gettempdir(), 'google_api_cache')
    ENABLE_CACHE = True
    CACHE_DISCOVERY = False
    
    # File settings
    BACKUP_FILENAME = 'tasks_backup.json'
    DATA_FILE = os.getenv('DATA_FILE', 'tasks.json')
    MIME_TYPE = 'application/json'
    
    # Application settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'SUPER_SECRET_KEY')
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 8080))
    
    # Google OAuth Configuration
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
    
    # Development settings
    OAUTHLIB_INSECURE_TRANSPORT = '1' if os.getenv('FLASK_ENV') != 'production' else '0'
    
    # Logging
    LOG_LEVEL = 'INFO'
