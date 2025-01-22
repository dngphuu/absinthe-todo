# Absinthe Todo App

A modern todo application with Google OAuth authentication and Google Drive sync functionality.

## Table of Contents
- [Absinthe Todo App](#absinthe-todo-app)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Prerequisites](#prerequisites)
  - [Project Structure](#project-structure)
  - [Setup \& Deployment on Repl.it](#setup--deployment-on-replit)
  - [Development Notes](#development-notes)
  - [Security Notes](#security-notes)

## Features
- Google OAuth2 authentication
- Task management (Create, Read, Update, Delete)
- Google Drive sync for task data
- Modern UI with Tailwind CSS
- Responsive design

## Prerequisites
- Python 3.8+
- pip (Python package manager)
- Node.js and npm (for Tailwind CSS)
- Google Cloud Console account

## Project Structure
```
Todo app/
├── static/
│   ├── css/
│   │   └── output.css
│   ├── js/
│   │   └── app.js
│   └── media_resources/
│       ├── favicon.ico
│       ├── logopng.png
│       └── onboarding.svg
├── templates/
│   ├── index.html
│   └── login.html
├── app.py
├── config.py
├── google_auth.py
├── task_manager.py
├── client_secret.json
├── requirements.txt
└── README.md
```

## Setup & Deployment on Repl.it

1. Create a new Python repl:
   - Go to [Repl.it](https://repl.it)
   - Click "Create Repl"
   - Select "Python" as language
   - Name your repl

2. Set up the project:
   - Upload project files or connect with GitHub
   - Ensure you have the following files in your repl:
     - All Python files (app.py, google_auth.py, etc.)
     - Templates and static files
     - requirements.txt
     - .replit configuration file

3. Configure Google Cloud Project:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable APIs:
     - Google Drive API
     - Google OAuth2 API
   - Configure OAuth consent screen:
     - Add required scopes
     - Add your Repl.it domain as an authorized domain
   - Create OAuth 2.0 Client ID:
     - Add authorized redirect URI: `https://your-repl-name.your-username.repl.co/oauth2callback`
     - Add authorized JavaScript origin: `https://your-repl-name.your-username.repl.co`

4. Set up environment secrets:
   - In your repl, go to "Tools" -> "Secrets"
   - Add a new secret:
     - Key: `CLIENT_SECRET`
     - Value: Paste the entire content of your client_secret.json file

5. Run the application:
   - Click the "Run" button
   - Your app will be available at your Repl.it URL

## Development Notes

- Keep `CLIENT_SECRET` secure in Repl.it Secrets
- Update Google OAuth redirect URIs with your Repl.it domain
- Monitor Google Cloud Console quotas
- Enable "Always On" in Repl.it if needed for continuous availability

## Security Notes

- Never commit sensitive credentials
- Use Repl.it Secrets for sensitive data
- Keep dependencies updated
- Monitor application logs
