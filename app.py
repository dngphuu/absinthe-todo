#=============================================================================
# IMPORTS & CONFIGURATIONS
#=============================================================================
from flask import Flask, render_template, redirect, request, session, url_for, jsonify
from functools import wraps
from config import Config
from task_manager import TaskManager
from google_auth import GoogleAuth
import os
import pathlib
from typing import Callable
import json

#=============================================================================
# APPLICATION INITIALIZATION
#=============================================================================
app = Flask(__name__,
            template_folder=Config.TEMPLATE_FOLDER,
            static_folder=Config.STATIC_FOLDER
            )
app.secret_key = Config.SECRET_KEY
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'  # Only for development

# Initialize services with config
task_manager = TaskManager()
google_auth = GoogleAuth(Config.GOOGLE_AUTH_CONFIG)

#=============================================================================
# AUTHENTICATION & SECURITY
#=============================================================================
def login_required(f: Callable) -> Callable:
    """Ensures user authentication before accessing protected routes
    
    Args:
        f (Callable): The route function to protect
    Returns:
        Callable: Decorated function with authentication check
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('isAuth'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

#=============================================================================
# AUTHENTICATION ROUTES
#=============================================================================
@app.route("/login")
def login():
    """Handles login page display and authentication flow initiation
    
    Returns:
        Response: Redirects to index if authenticated, otherwise shows login page
    """
    if session.get('isAuth'):
        return redirect(url_for('index'))
    return render_template("login.html")

@app.route('/google-login')
def google_login():
    """Initiate Google OAuth flow"""
    try:
        authorization_url, state = google_auth.create_auth_flow(
            url_for('oauth2callback', _external=True)
        )
        session['state'] = state
        return redirect(authorization_url)
    except Exception as e:
        app.logger.error(f"Google login failed: {str(e)}")
        return redirect(url_for('login'))

@app.route('/oauth2callback')
def oauth2callback():
    """Handle Google OAuth callback"""
    try:
        if 'state' not in session:
            return redirect(url_for('login'))

        # Get credentials
        credentials = google_auth.get_credentials(
            request.url,
            session['state'],
            url_for('oauth2callback', _external=True)
        )

        # Store credentials and user info in session
        session['credentials'] = credentials
        user_info = google_auth.get_user_info(credentials)
        session['user'] = user_info
        session['isAuth'] = True
        
        # Debug logging
        app.logger.info(f"Successfully authenticated user: {user_info.get('email')}")
        
        return redirect(url_for('index'))
    except Exception as e:
        app.logger.error(f"OAuth callback failed: {str(e)}")
        return redirect(url_for('login'))

@app.route("/logout")
def logout():
    """Clear session and logout user"""
    session.clear()
    return redirect(url_for("login"))

#=============================================================================
# TASK MANAGEMENT ROUTES
#=============================================================================
@app.route("/")
@login_required
def index():
    """Main application page displaying task list"""
    try:
        tasks = task_manager.load_tasks()
        return render_template("index.html", tasks=tasks, user=session.get('user'))
    except Exception as e:
        app.logger.error(f"Error loading tasks: {str(e)}")
        return render_template("index.html", tasks=[], user=session.get('user'))

#=============================================================================
# TASK CRUD API ENDPOINTS
#=============================================================================
@app.route("/add-task", methods=["POST"])
@login_required
def add_task():
    """Creates a new task
    
    Request Body:
        task (str): Task content
    Returns:
        JSON: Status and task data or error message
    """
    task_content = request.form.get("task")
    if not task_content:
        return jsonify({"status": "error", "message": "Task content is required"})
    
    try:
        new_task = task_manager.add_task(task_content)
        return jsonify({"status": "success", "task": new_task})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route("/update-task", methods=["POST"])
@login_required
def update_task():
    try:
        task_id = request.form.get("id")
        task_content = request.form.get("content")
        task_completed = request.form.get("completed")
        completed = task_completed.lower() == 'true' if task_completed else None

        task = task_manager.update_task(task_id, task_content, completed)
        if task:
            return jsonify({"status": "success", "task": task})
        return jsonify({"status": "error", "message": "Task not found"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route("/delete-task", methods=["POST"])
@login_required
def delete_task():
    try:
        task_id = request.form.get("id")
        if not task_id:
            return jsonify({"status": "error", "message": "Task ID is missing"})
        
        if task_manager.delete_task(task_id):
            return jsonify({"status": "success"})
        return jsonify({"status": "error", "message": "Task not found"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

#=============================================================================
# TASK SYNC ROUTES
#=============================================================================
@app.route("/sync-tasks", methods=["POST"])
@login_required
def sync_tasks():
    """Sync tasks to Google Drive and return current task list"""
    try:
        credentials = session.get('credentials')
        if not credentials:
            return jsonify({"status": "error", "message": "Not authenticated with Google"})
        
        # Upload tasks file to Google Drive
        file_id = google_auth.upload_to_drive(
            credentials,
            task_manager.tasks_file
        )
        
        # Get current tasks to return to client
        current_tasks = task_manager.load_tasks()
        
        return jsonify({
            "status": "success",
            "message": "Tasks synced successfully",
            "fileId": file_id,
            "tasks": current_tasks
        })
    except Exception as e:
        app.logger.error(f"Task sync failed: {str(e)}")
        return jsonify({"status": "error", "message": str(e)})

if __name__ == "__main__":
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )