# Absinthe Todo App

Absinthe Todo App revolutionizes task management with seamless Google Drive synchronization and an intuitive user interface. Our standout **Magic Sort** feature empowers users to effortlessly organize their tasks, enhancing productivity and workflow efficiency.

## Key Features

- 🔄 Cloud sync (using GG Drive)
- 🎩 **Magic Sort** powered by AI
- ✨ Clean and modern interface
- 🔐 Secure Google authentication
- 🔍 AI-powered task sorting

## Quick Start Guide

1. Download and install the app
2. Set up Google OAuth credentials (optional - pre-setup available)
3. Configure environment variables
4. Run the application
5. Log in with Google account

Detailed instructions in the [Installation Guide](#installation-guide) section.

## Prerequisites

### Required Software

- Python 3.8 or newer ([Download](https://www.python.org/downloads/))
- Web browser (Chrome recommended)
- Text editor (Notepad, VS Code, etc.)

### Accounts Needed

- Google Account ([Create one](https://accounts.google.com/signup))
- Google Cloud Platform account (optional - [Get started](https://console.cloud.google.com/))
- OpenAI API key for Magic Sort ([Get key](https://platform.openai.com/api-keys)) (optional - test key included)

### Optional Development Tools

- Node.js 16+ (for frontend development)
- Git (for version control)

## Installation Guide

### 1. Download and Setup

1. Get the project files:

   - Download ZIP from [GitHub](https://github.com/dngphuu/absinthe-todo)
   - Extract to desired location (e.g., Desktop)

2. Install Python:
   - Run Python installer
   - ✅ Check "Add Python to PATH"
   - Click "Install Now"

### 2. Google Cloud Setup

> Note: This step is optional. A pre-configured OAuth setup is available in the default .env.example file.

1. Create project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable Google Drive API
3. Configure OAuth:
   - Set up consent screen
   - Create OAuth 2.0 credentials
   - Add redirect URI: `http://localhost:8080/oauth2callback`
   - Save Client ID and Secret

### 3. Environment Setup

1. Create environment file:

   - Copy `.env.example` to `.env`
   - Open `.env` in text editor

2. Configure settings:

> Note: An OpenAI API key is included in .env.example for testing purposes. Please use responsibly and consider getting your own key for production use.

```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
SECRET_KEY=random-secret-key
OPENAI_API_KEY=your-openai-key
DEBUG=True
PORT=8080
```

### 4. Installation Steps

1. Create Python environment:

   - Open project folder
   - Shift + Right-click → "Open PowerShell here"
   - Run:
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     pip install -r requirements.txt
     ```

2. Frontend setup (optional):
   - Install Node.js
   - Run in project folder:
     ```bash
     npm install
     npm run build
     ```

### 5. Running the App

1. Start the server:
   ```bash
   python app.py
   ```
2. Visit http://localhost:8080
3. Log in with Google
4. Start managing tasks!

## API Documentation

### Task Endpoints

- GET `/` - View tasks
- POST `/add-task` - Create task
- POST `/update-task` - Update task
- POST `/delete-task` - Delete task
- POST `/sync-tasks` - Sync with Drive

### Auth Endpoints

- GET `/login` - Login page
- GET `/google-login` - Start OAuth
- GET `/oauth2callback` - OAuth callback
- GET `/logout` - Logout

## Tech Stack

- Backend: Python/Flask
- Frontend: JavaScript, Tailwind CSS
- Auth: Google OAuth2
- Storage: Google Drive API
- Cache: File-based
- Logging: Python logging

## Team

Project of **Absinthe** team including:

- Dang Gia Phu (me)
- Truong Duy Dat
- Nguyen Manh Duong
- Nguyen Dinh Khang
- Le Huu Tuan Dung

## Acknowledgments

- UI inspired by [jrgarciadev/nextjs-todo-list](https://github.com/jrgarciadev/nextjs-todo-list)
- Special thanks to GDGoC PTIT mentors 💖
- About 80-90% of the project's code is written by AI. Through trial and error, with many many prompting tries, me and him completed this project😓
- More than being passed probation, I prefer making a useful, easy-to-use and convenient for user. Therefore, I have to use AI in order to complete this project. Pardon me!!
