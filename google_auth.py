#=============================================================================
# IMPORTS & TYPE HINTS
#=============================================================================
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
import google.oauth2.credentials
import googleapiclient.discovery
import os
import json

class GoogleAuth:
    def __init__(self, client_id, client_secret):
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

    def create_auth_flow(self, redirect_uri):
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
            raise Exception(f"Failed to create auth flow: {str(e)}")

    def get_credentials(self, authorization_response, state, redirect_uri):
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
            raise Exception(f"Failed to get credentials: {str(e)}")

    def get_user_info(self, credentials_json):
        try:
            if isinstance(credentials_json, str):
                credentials_dict = json.loads(credentials_json)
            else:
                credentials_dict = credentials_json

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
            raise Exception(f"Failed to get user info: {str(e)}")

    def upload_to_drive(self, credentials_json, file_path, mime_type='application/json'):
        try:
            credentials = google.oauth2.credentials.Credentials.from_authorized_user_info(
                json.loads(credentials_json))
            
            service = googleapiclient.discovery.build('drive', 'v3', credentials=credentials)
            
            file_metadata = {
                'name': 'tasks_backup.json',
                'mimeType': mime_type
            }
            
            # Search for existing file
            results = service.files().list(
                q="name='tasks_backup.json'",
                spaces='drive',
                fields='files(id, name)'
            ).execute()
            
            media = googleapiclient.http.MediaFileUpload(
                file_path,
                mimetype=mime_type,
                resumable=True
            )
            
            if results.get('files'):
                # Update existing file
                file_id = results['files'][0]['id']
                file = service.files().update(
                    fileId=file_id,
                    media_body=media
                ).execute()
            else:
                # Create new file
                file = service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id'
                ).execute()
            
            return file.get('id')
        except Exception as e:
            raise Exception(f"Failed to upload to Drive: {str(e)}")
