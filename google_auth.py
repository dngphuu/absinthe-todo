#=============================================================================
# IMPORTS & TYPE HINTS
#=============================================================================
from typing import Dict, Any, Optional, Tuple
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
import json
import io

class GoogleAuth:
    """Handles Google OAuth2 authentication and Google Drive operations
    
    This class manages all Google-related operations including:
    - OAuth2 authentication flow
    - User information retrieval
    - Google Drive file synchronization
    """
    
    #=========================================================================
    # CLASS CONFIGURATION
    #=========================================================================
    SCOPES = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'openid'
    ]

    def __init__(self, client_secrets_file: str):
        self.client_secrets_file = client_secrets_file

    #=========================================================================
    # AUTHENTICATION METHODS
    #=========================================================================
    def create_auth_flow(self, redirect_uri: str) -> Tuple[str, str]:
        """Initializes OAuth2 authentication flow
        
        Args:
            redirect_uri (str): OAuth2 callback URL
        Returns:
            Tuple[str, str]: Authorization URL and state token
        """
        flow = Flow.from_client_secrets_file(
            self.client_secrets_file,
            scopes=self.SCOPES,
            redirect_uri=redirect_uri
        )
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )
        return authorization_url, state

    def get_credentials(self, authorization_response: str, state: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for credentials"""
        flow = Flow.from_client_secrets_file(
            self.client_secrets_file,
            scopes=self.SCOPES,
            state=state,
            redirect_uri=redirect_uri
        )
        flow.fetch_token(authorization_response=authorization_response)
        return {
            'token': flow.credentials.token,
            'refresh_token': flow.credentials.refresh_token,
            'token_uri': flow.credentials.token_uri,
            'client_id': flow.credentials.client_id,
            'client_secret': flow.credentials.client_secret,
            'scopes': flow.credentials.scopes
        }

    def refresh_credentials(self, credentials_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Refresh expired credentials"""
        try:
            credentials = Credentials(**credentials_dict)
            if credentials.expired:
                credentials.refresh(Request())
                return {
                    'token': credentials.token,
                    'refresh_token': credentials.refresh_token,
                    'token_uri': credentials.token_uri,
                    'client_id': credentials.client_id,
                    'client_secret': credentials.client_secret,
                    'scopes': credentials.scopes
                }
            return credentials_dict
        except Exception as e:
            raise Exception(f"Failed to refresh credentials: {str(e)}")

    def get_user_info(self, credentials_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch user information using OAuth2 credentials"""
        try:
            # Try to refresh credentials if expired
            credentials_dict = self.refresh_credentials(credentials_dict)
            credentials = Credentials(**credentials_dict)
            service = build('oauth2', 'v2', credentials=credentials)
            user_info = service.userinfo().get().execute()
            return {
                'name': user_info.get('name'),
                'email': user_info.get('email'),
                'picture': user_info.get('picture')
            }
        except Exception as e:
            raise Exception(f"Failed to get user info: {str(e)}")

    #=========================================================================
    # GOOGLE DRIVE OPERATIONS
    #=========================================================================
    def sync_drive_data(self, credentials_dict: Dict[str, Any], data: Dict) -> Optional[Dict]:
        """Synchronizes local data with Google Drive
        
        Args:
            credentials_dict (Dict): OAuth2 credentials
            data (Dict): Local data to sync
        Returns:
            Optional[Dict]: Synchronized data or None on failure
        """
        credentials = Credentials(**credentials_dict)
        drive_service = build('drive', 'v3', credentials=credentials)

        try:
            # Search for existing file
            results = drive_service.files().list(
                q="name='data.json'",
                spaces='drive'
            ).execute()
            files = results.get('files', [])

            if files:
                return self._download_file(drive_service, files[0]['id'])
            else:
                return self._upload_file(drive_service, data)
        except Exception as e:
            raise Exception(f"Drive sync failed: {str(e)}")

    #=========================================================================
    # HELPER METHODS
    #=========================================================================
    def _download_file(self, drive_service: Any, file_id: str) -> Dict:
        """Internal method for file download from Drive
        
        Args:
            drive_service (Any): Google Drive service instance
            file_id (str): ID of file to download
        Returns:
            Dict: Downloaded and parsed file content
        """
        request = drive_service.files().get_media(fileId=file_id)
        file = io.BytesIO()
        downloader = MediaIoBaseDownload(file, request)
        
        done = False
        while not done:
            _, done = downloader.next_chunk()
        
        file.seek(0)
        return json.loads(file.read().decode())

    def _upload_file(self, drive_service: Any, data: Dict) -> Dict:
        """Upload file to Google Drive"""
        file_metadata = {'name': 'data.json'}
        media = MediaIoBaseUpload(
            io.BytesIO(json.dumps(data).encode()),
            mimetype='application/json',
            resumable=True
        )
        drive_service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()
        return data
