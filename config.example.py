import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'YOUR APP SECRET KEY HERE')
    DATA_FILE = os.getenv('DATA_FILE', 'YOUR DATA FILE HERE')
    
    # Hardcoded paths
    TEMPLATE_FOLDER = 'templates'
    STATIC_FOLDER = 'static'
    
    # Application settings
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 8080))
    
    # Google OAuth Configuration
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', 'DEFAULT_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', 'DEFAULT_CLIENT_SECRET')
    GOOGLE_AUTH_CONFIG = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "redirect_uris": ["http://localhost:8080/oauth2callback"],
            "javascript_origins": ["http://localhost:8080"]
        }
    }
