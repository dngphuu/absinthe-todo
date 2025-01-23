# Todo App with Google Drive Sync

A modern todo application built with Flask and JavaScript that helps you manage tasks with Google Drive synchronization.

## Key Features

- 🔐 Secure Google account authentication
- ✨ Clean and modern interface
- 📱 Fully responsive design
- ⌨️ Keyboard accessibility
- 🔄 Google Drive sync
- 🎯 Instant task updates

## Tech Stack

- Backend: Python/Flask
- Frontend: JavaScript, Tailwind CSS
- Authentication: Google OAuth2
- Storage: Google Drive, local

## Prerequisites

- Python 3.8+
- Node.js 16+
- Google account
- Google Cloud Platform project (for API access) (development)

## Quick Start

1. Clone and setup:

Run install script:

- INSTALL.ps1 (Windows)
- INSTALL.sh (Linux/MacOS)

2. Configure Google OAuth (Optional):

- Create a project in [Google Cloud Console](https://console.cloud.google.com)
- Enable Google Drive API
- Create OAuth 2.0 credentials
- Edit GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in config.py

3. Environment setup (Optional):

```bash
cp .env.example .env
# Edit .env with your settings
```

4. Build and run:

```bash
# Build CSS
npm run build

# Start server
python app.py
```

Visit `http://localhost:8080` to use the app!

## Development

Start development server with hot-reload:

```bash
npm run watch  # CSS hot-reload
python app.py  # Flask development server
```

## Deployment

1. Set production environment variables:

Edit .env file:

```bash
FLASK_ENV=production
DEBUG=False
```

2. Build production assets:

```bash
npm run build
```

3. Use a production WSGI server:

```bash
gunicorn app:app
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - feel free to use this project for learning and development!
