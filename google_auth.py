import os
import json
import logging
from pathlib import Path
from typing import Dict, Optional, Tuple, Any
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
import google.oauth2.credentials
import googleapiclient.discovery
import googleapiclient.http
from config import Config  # Only import the Config class

class GoogleAuth:
    """Handles Google OAuth2 authentication and Drive operations"""

    def __init__(self, client_id: str, client_secret: str):
        self._setup_logging()
        if Config.ENABLE_CACHE:
            self._setup_cache()
        self._initialize_auth_config(client_id, client_secret)

    def _setup_logging(self) -> None:
        """Configure logging"""
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger('GoogleAuth')

    def _setup_cache(self) -> None:
        """Setup cache directory for Google API discovery"""
        if not os.path.exists(Config.CACHE_DIR):
            os.makedirs(Config.CACHE_DIR)
        os.environ['GOOGLE_API_DISCOVERY_FILE_CACHE_DIR'] = Config.CACHE_DIR
        self.logger.info(f"Using cache directory: {Config.CACHE_DIR}")

    def _initialize_auth_config(self, client_id: str, client_secret: str) -> None:
        """Initialize authentication configuration"""
        self.client_id = client_id
        self.client_secret = client_secret
        self.SCOPES = [
            'openid',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ]
        self.auth_config = {
            "web": {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "redirect_uris": ["http://localhost:8080/oauth2callback"],
                "javascript_origins": ["http://localhost:8080"]
            }
        }

    #=============================================================================
    # Authentication Methods
    #=============================================================================
    
    def create_auth_flow(self, redirect_uri: str) -> Tuple[str, str]:
        try:
            flow = Flow.from_client_config(
                self.auth_config,
                scopes=self.SCOPES,
                redirect_uri=redirect_uri
            )
            authorization_url, state = flow.authorization_url(
                access_type='offline',
                include_granted_scopes='true',
                prompt='consent'
            )
            return authorization_url, state
        except Exception as e:
            self.logger.error(f"Failed to create auth flow: {str(e)}")
            raise

    def get_credentials(self, authorization_response: str, state: str, redirect_uri: str) -> str:
        try:
            flow = Flow.from_client_config(
                self.auth_config,
                scopes=self.SCOPES,
                state=state,
                redirect_uri=redirect_uri
            )
            flow.fetch_token(authorization_response=authorization_response)
            return flow.credentials.to_json()
        except Exception as e:
            self.logger.error(f"Failed to get credentials: {str(e)}")
            raise

    def get_user_info(self, credentials_json: str) -> Dict[str, Any]:
        try:
            credentials_dict = json.loads(credentials_json)
            if 'expiry' in credentials_dict:
                credentials_dict['expiry'] = credentials_dict['expiry'].isoformat() if hasattr(credentials_dict['expiry'], 'isoformat') else str(credentials_dict['expiry'])

            credentials = google.oauth2.credentials.Credentials(
                token=credentials_dict.get('token'),
                refresh_token=credentials_dict.get('refresh_token'),
                token_uri=credentials_dict.get('token_uri'),
                client_id=credentials_dict.get('client_id'),
                client_secret=credentials_dict.get('client_secret'),
                scopes=credentials_dict.get('scopes')
            )
            
            service = googleapiclient.discovery.build('oauth2', 'v2', credentials=credentials)
            return service.userinfo().get().execute()
        except Exception as e:
            self.logger.error(f"Failed to get user info: {str(e)}")
            raise

    #=============================================================================
    # Drive Operations
    #=============================================================================
    
    def _build_drive_service(self, credentials_json: str) -> Any:
        """Build and return Google Drive service"""
        credentials = google.oauth2.credentials.Credentials.from_authorized_user_info(
            json.loads(credentials_json))
        return googleapiclient.discovery.build(
            'drive', 
            'v3', 
            credentials=credentials,
            cache_discovery=Config.CACHE_DISCOVERY  # Use config value
        )

    def upload_to_drive(self, credentials_json: str, file_path: str, 
                        mime_type: str = Config.MIME_TYPE) -> Optional[str]:
        """Upload file to Google Drive"""
        try:
            service = self._build_drive_service(credentials_json)
            
            file_metadata = {
                'name': Config.BACKUP_FILENAME,
                'mimeType': mime_type
            }
            
            results = service.files().list(
                q=f"name='{Config.BACKUP_FILENAME}'",
                spaces='drive',
                fields='files(id, name)'
            ).execute()
            
            media = googleapiclient.http.MediaFileUpload(
                file_path, mimetype=mime_type, resumable=True)
            
            if results.get('files'):
                file_id = results['files'][0]['id']
                file = service.files().update(
                    fileId=file_id,
                    media_body=media
                ).execute()
                self.logger.info(f"Updated existing backup: {file_id}")
            else:
                file = service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id'
                ).execute()
                self.logger.info(f"Created new backup: {file.get('id')}")
            
            return file.get('id')
        except Exception as e:
            self.logger.error(f"Upload failed: {str(e)}")
            raise

    def get_drive_file_metadata(self, credentials_json: str, file_name: str = Config.BACKUP_FILENAME) -> Optional[Dict[str, Any]]:
        try:
            service = self._build_drive_service(credentials_json)
            
            results = service.files().list(
                q=f"name='{file_name}'",
                spaces='drive',
                fields='files(id, name, modifiedTime)'
            ).execute()
            
            if results.get('files'):
                return results['files'][0]
            return None
        except Exception as e:
            self.logger.error(f"Failed to get file metadata: {str(e)}")
            raise

    def download_from_drive(self, credentials_json: str, file_id: str) -> Dict[str, Any]:
        try:
            service = self._build_drive_service(credentials_json)
            
            request = service.files().get_media(fileId=file_id)
            file_content = request.execute()
            
            return json.loads(file_content)
        except Exception as e:
            self.logger.error(f"Failed to download from Drive: {str(e)}")
            raise

    #=============================================================================
    # Sync Operations
    #=============================================================================
    
    def sync_with_cloud(self, credentials_json: str, task_manager: Any) -> bool:
        """Synchronize tasks with cloud storage"""
        try:
            file_metadata = self.get_drive_file_metadata(credentials_json)
            
            if not file_metadata:
                self.upload_to_drive(credentials_json, task_manager.tasks_file)
                self.logger.info("Created initial cloud backup")
                return True
            
            cloud_data = self.download_from_drive(credentials_json, file_metadata['id'])
            cloud_sync_time = cloud_data.get('last_sync')
            
            if not task_manager.last_sync or (cloud_sync_time and cloud_sync_time > task_manager.last_sync):
                self.logger.info("Cloud data is newer, merging changes")
                return task_manager.merge_tasks(cloud_data)
            elif not cloud_sync_time or task_manager.last_sync > cloud_sync_time:
                self.logger.info("Local data is newer, uploading changes")
                self.upload_to_drive(credentials_json, task_manager.tasks_file)
                return True
            
            self.logger.info("No sync needed - data is up to date")
            return False
        except Exception as e:
            self.logger.error(f"Sync failed: {str(e)}")
            raise
