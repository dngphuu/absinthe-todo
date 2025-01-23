# Todo App with Google Drive Sync

A modern todo application built with Flask and JavaScript that helps you manage tasks with Google Drive synchronization.

## Key Features

- 🔐 Secure Google account authentication
- ✨ Clean and modern interface
- 📱 Fully responsive design
- ⌨️ Keyboard accessibility
- 🔄 Real-time Google Drive sync
- 🎯 Instant task updates

## Tech Stack

- Backend: Python/Flask
- Frontend: JavaScript, Tailwind CSS
- Authentication: Google OAuth2
- Storage: Google Drive API, local JSON
- Cache: File-based caching
- Logging: Python logging module

## Prerequisites

Before starting, ensure you have:

- [Python 3.8+](https://www.python.org/downloads/) installed
  - [Windows installation guide](https://docs.python.org/3/using/windows.html)
  - [Linux/MacOS installation guide](https://docs.python.org/3/using/unix.html)
- [Git](https://git-scm.com/downloads) installed
  - [Git setup guide](https://github.com/git-guides/install-git)
- [Google account](https://accounts.google.com/signup)
- [Google Cloud Platform](https://console.cloud.google.com/) project
  - [Getting started with GCP](https://cloud.google.com/gcp/getting-started)

### Development Prerequisites

If you plan to modify the frontend styles (TailwindCSS):

- [Node.js 16+](https://nodejs.org/en/download/)
  - Used for TailwindCSS compilation and frontend development
  - Required if you plan to modify frontend assets
  - Download and install from the official website or use a version manager like nvm

## Installation Guide

### 1. Project Setup

```bash
# Clone the repository
git clone https://github.com/dngphuu/absinthe-todo.git

# Navigate to project directory
cd todo-app

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# For Windows (use one of these commands):
venv\Scripts\activate     # Using Command Prompt
.\venv\Scripts\activate  # Using PowerShell

# For Linux/MacOS:
source venv/bin/activate

# Install required packages
pip install -r requirements.txt

# Install Node.js dependencies (for frontend development)
npm install

# Build frontend assets
npm run build
```

💡 **Windows Command Tips:**

- If you get "execution policy" errors in PowerShell, run:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
- Use backslashes (`\`) for file paths in Windows
- Use `cd` to change directories, for example: `cd C:\Users\YourName\Desktop\todo-app`

### 2. Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Google Drive API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"
4. Configure OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type
   - Fill in required information (app name, user support email, developer contact)
5. Create OAuth credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application"
   - Add authorized redirect URIs:
     - http://localhost:8080/oauth2callback (for local use/development)
   - Save and note down your Client ID and Client Secret

### 3. Environment Configuration

1. Create your environment file by copying the example file:

```bash
# For Windows Command Prompt:
copy .env.example .env

# For Windows PowerShell:
Copy-Item .env.example .env

# For Linux/MacOS:
cp .env.example .env
```

💡 **File Copying Tips:**

- Make sure you're in the project directory
- In Windows Explorer, you can also manually copy and rename the file:
  1. Right-click on `.env.example`
  2. Select "Copy"
  3. Right-click in the same folder
  4. Select "Paste"
  5. Rename the new file to `.env`

2. Edit the .env file:

- Open `.env` with any text editor (Notepad, VS Code, etc.)
- If you can't see the file in Windows Explorer, enable "Show hidden files":
  1. Open File Explorer
  2. Click "View" at the top
  3. Check "Hidden items" in the "Show/hide" section

```bash
# Required changes in .env:
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
SECRET_KEY=your-random-secret-key

# Optional changes (defaults are usually fine):
DEBUG=True
PORT=8080
```

⚠️ IMPORTANT:

- Never commit your .env file to version control
- Make sure the file is named exactly `.env` (not `.env.txt`)
- In Windows, if using Notepad, save with "All Files (_._)" and not as "Text Document"

### 4. Running the Application

```bash
# Make sure your virtual environment is activated
# Then start the application:
python app.py

# The app will be available at:
# http://localhost:8080
```

💡 **Running Tips:**

- If you close your terminal, you'll need to activate the virtual environment again
- To stop the application, press Ctrl+C in the terminal
- If port 8080 is in use, change the PORT in your .env file

### 5. Verify Installation

1. Visit http://localhost:8080
2. You should see the login page
3. Try logging in with your Google account
4. Create a test task to verify everything works

### Troubleshooting

If you encounter issues:

1. Ensure all environment variables are set correctly
2. Check if Google OAuth credentials are properly configured
3. Verify that the virtual environment is activated
4. Check the console for error messages

## Development Guide

### Local Development

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies
npm install

# Watch for frontend changes
npm run watch

# In a separate terminal, run the Flask app
FLASK_ENV=development python app.py
```

### API Documentation

#### Task Endpoints

- GET `/` - Main task view
- POST `/add-task` - Create task
- POST `/update-task` - Update task
- POST `/delete-task` - Delete task
- POST `/sync-tasks` - Sync with Google Drive

#### Authentication Endpoints

- GET `/login` - Login page
- GET `/google-login` - Start OAuth flow
- GET `/oauth2callback` - OAuth callback
- GET `/logout` - Logout user

## License

MIT License
