#=============================================================================
# IMPORTS & CONFIGURATIONS
#=============================================================================
from flask import Flask, render_template, redirect, request, session, url_for, jsonify
from functools import wraps
from config import Config
from task_manager import TaskManager
from google_auth import GoogleAuth
from magic_sort import MagicSort
import os
from typing import Callable

#=============================================================================
# APPLICATION INITIALIZATION
#=============================================================================
# Set OAuth transport security based on configuration
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = Config.OAUTHLIB_INSECURE_TRANSPORT

app = Flask(__name__,
            template_folder=Config.TEMPLATE_FOLDER,
            static_folder=Config.STATIC_FOLDER
            )
app.secret_key = Config.SECRET_KEY

# Initialize services with config
task_manager = TaskManager()
google_auth = GoogleAuth(Config.GOOGLE_CLIENT_ID, Config.GOOGLE_CLIENT_SECRET)
magic_sorter = MagicSort()

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
        return render_template("index.html", 
                            tasks=tasks, 
                            initial_tasks=[],
                            user=session.get('user', {}))  # Pass user info explicitly
    except Exception as e:
        app.logger.error(f"Error loading tasks: {str(e)}")
        return render_template("index.html", 
                            tasks=[], 
                            user=session.get('user', {}))

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
    """Sync tasks with Google Drive"""
    try:
        credentials = session.get('credentials')
        if not credentials:
            return jsonify({"status": "error", "message": "Not authenticated with Google"})
        
        # First check if there's a cloud version
        file_metadata = google_auth.get_drive_file_metadata(credentials)
        
        if file_metadata:
            # Download and merge cloud data
            cloud_data = google_auth.download_from_drive(credentials, file_metadata['id'])
            task_manager.merge_tasks(cloud_data)
        
        # Upload current state to cloud
        file_id = google_auth.upload_to_drive(credentials, task_manager.tasks_file)
        
        # Get final task list with proper formatting
        current_tasks = task_manager.load_tasks()
        
        # Ensure each task has required fields
        formatted_tasks = [{
            'id': task.get('id'),
            'content': task.get('content'),
            'completed': task.get('completed', False),
            'quadrant': task.get('quadrant'),
            'created_at': task.get('created_at'),
            'updated_at': task.get('updated_at')
        } for task in current_tasks]
        
        return jsonify({
            "status": "success",
            "message": "Tasks synced successfully",
            "fileId": file_id,
            "tasks": formatted_tasks
        })
    except Exception as e:
        app.logger.error(f"Task sync failed: {str(e)}")
        return jsonify({"status": "error", "message": str(e)})

#=============================================================================
# MAGIC SORT ROUTES
#=============================================================================
@app.route("/magic-sort", methods=["POST"])
@login_required
def magic_sort():
    """Sort tasks using Eisenhower Matrix"""
    try:
        result = magic_sorter.process_tasks()
        if result and result.get('tasks'):
            # Update task manager with sorted tasks
            task_manager.tasks = result['tasks']
            task_manager.save_tasks()
            return jsonify({
                "status": "success",
                "message": "Tasks sorted successfully",
                "tasks": result['tasks']
            })
        return jsonify({
            "status": "error",
            "message": "No tasks to sort"
        })
    except Exception as e:
        app.logger.error(f"Magic sort failed: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": str(e)
        })

if __name__ == "__main__":
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )