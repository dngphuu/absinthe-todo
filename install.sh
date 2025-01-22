#!/bin/bash

echo -e "\033[0;32mStarting installation process for Linux...\033[0m"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "\033[0;31mPython 3 is not installed. Please install Python 3 first:\033[0m"
    echo "sudo apt-get update && sudo apt-get install python3 python3-pip"
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo -e "\033[0;33mInstalling pip...\033[0m"
    curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
    python3 get-pip.py
    rm get-pip.py
fi

# Install required packages
echo -e "\033[0;33mInstalling required Python packages...\033[0m"
python3 -m pip install --upgrade pip
python3 -m pip install google-auth-oauthlib google-auth google-api-python-client flask

echo -e "\033[0;33mCreating necessary directories...\033[0m"
mkdir -p data

echo -e "\033[0;32mInstallation completed!\033[0m"
echo -e "\033[0;36mTo run the app, use: python3 app.py\033[0m"
