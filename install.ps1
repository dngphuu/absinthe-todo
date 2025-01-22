Write-Host "Starting installation process for Windows..." -ForegroundColor Green

# Check if Python is installed
try {
    python --version
} catch {
    Write-Host "Python is not installed. Please install Python 3 from https://www.python.org/downloads/" -ForegroundColor Red
    exit 1
}

# Check if pip is installed
try {
    pip --version
} catch {
    Write-Host "Installing pip..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri https://bootstrap.pypa.io/get-pip.py -OutFile get-pip.py
    python get-pip.py
    Remove-Item get-pip.py
}

# Install required packages
Write-Host "Installing required Python packages..." -ForegroundColor Yellow
python -m pip install --upgrade pip
python -m pip install google-auth-oauthlib google-auth google-api-python-client flask

# Create necessary directories
Write-Host "Creating necessary directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "data"

Write-Host "Installation completed!" -ForegroundColor Green
Write-Host "To run the app, use: python app.py" -ForegroundColor Cyan
