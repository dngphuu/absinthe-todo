#=============================================================================
# IMPORTS & TYPE HINTS
#=============================================================================
from typing import Dict, Any, Optional, Tuple
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.auth import exceptions as google_exceptions
import json
import os
from pathlib import Path

class GoogleAuth:
    """Handles Google OAuth2 authentication and user information
    
    This class manages Google-related operations including:
    - OAuth2 authentication flow
    - User information retrieval
    """
    
    #=========================================================================
    # CLASS CONFIGURATION
    #=========================================================================
    SCOPES = [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'openid'
    ]

    def __init__(self, client_secrets_file: str):
        """
        Initializes the GoogleAuth instance.

        Args:
            client_secrets_file (str): Path to the client secrets JSON file.
        """
        self.client_secrets_file = client_secrets_file
        self.credentials_path = os.path.join(Path.home(), '.todo_app_credentials.json')

    def create_auth_flow(self, redirect_uri: str) -> Tuple[str, str]:
        """Initializes OAuth2 authentication flow
        
        Args:
            redirect_uri (str): The URI to which the user will be redirected after authentication.
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
        credentials_dict = {
            'token': flow.credentials.token,
            'refresh_token': flow.credentials.refresh_token,
            'token_uri': flow.credentials.token_uri,
            'client_id': flow.credentials.client_id,
            'client_secret': flow.credentials.client_secret,
            'scopes': flow.credentials.scopes
        }
        
        # Save credentials securely
        self.save_credentials(credentials_dict)
        return credentials_dict

    def refresh_credentials(self, credentials_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Refresh expired credentials"""
        try:
            credentials = Credentials(**credentials_dict)
            if credentials.expired and credentials.refresh_token:
                credentials.refresh(Request())
                updated_credentials = {
                    'token': credentials.token,
                    'refresh_token': credentials.refresh_token,
                    'token_uri': credentials.token_uri,
                    'client_id': credentials.client_id,
                    'client_secret': credentials.client_secret,
                    'scopes': credentials.scopes
                }
                # Update cached credentials
                self.save_credentials(updated_credentials)
                return updated_credentials
            return credentials_dict
        except Exception as e:
            raise Exception(f"Failed to refresh credentials: {str(e)}")

    def get_user_info(self, credentials_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Get Google user information
        
        Args:
            credentials_dict (Dict[str, Any]): The credentials dictionary
        Returns:
            Dict[str, Any]: User information including email and name
        """
        try:
            credentials = Credentials(**credentials_dict)
            service = build('oauth2', 'v2', credentials=credentials)
            user_info = service.userinfo().get().execute()
            return {
                'email': user_info.get('email'),
                'name': user_info.get('name'),
                'picture': user_info.get('picture')
            }
        except Exception as e:
            raise Exception(f"Failed to get user info: {str(e)}")

    def validate_credentials(self, credentials_dict: Dict[str, Any]) -> bool:
        """Check if credentials are valid and not expired
        
        Args:
            credentials_dict (Dict[str, Any]): The credentials dictionary
        Returns:
            bool: True if credentials are valid, False otherwise
        """
        try:
            credentials = Credentials(**credentials_dict)
            if not credentials.valid:
                if credentials.expired and credentials.refresh_token:
                    credentials_dict = self.refresh_credentials(credentials_dict)
                    return True
                return False
            return True
        except Exception:
            return False

    def save_credentials(self, credentials_dict: Dict[str, Any]) -> None:
        """Save credentials to a secure location
        
        Args:
            credentials_dict (Dict[str, Any]): The credentials to save
        """
        try:
            with open(self.credentials_path, 'w') as f:
                json.dump(credentials_dict, f)
        except Exception as e:
            raise Exception(f"Failed to save credentials: {str(e)}")

    def load_credentials(self) -> Optional[Dict[str, Any]]:
        """Load saved credentials if they exist
        
        Returns:
            Optional[Dict[str, Any]]: The loaded credentials or None
        """
        try:
            if os.path.exists(self.credentials_path):
                with open(self.credentials_path, 'r') as f:
                    credentials_dict = json.load(f)
                if self.validate_credentials(credentials_dict):
                    return credentials_dict
        except Exception:
            pass
        return None
