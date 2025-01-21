from flask import Flask, render_template, redirect, request, session, url_for, jsonify
from functools import wraps
from config import Config
from task_manager import TaskManager

app = Flask(__name__, template_folder=Config.TEMPLATE_FOLDER)
app.secret_key = Config.SECRET_KEY
task_manager = TaskManager()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('isAuth'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        session['isAuth'] = True
        return redirect(url_for("index"))
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.pop('isAuth', None)
    return redirect(url_for("login"))

@app.route("/")
@login_required
def index():
    tasks = task_manager.load_tasks()
    return render_template("index.html", tasks=tasks)

@app.route("/add-task", methods=["POST"])
@login_required
def add_task():
    task_content = request.form.get("task")
    if not task_content:
        return jsonify({"status": "error", "message": "Task content is required"})
    
    new_task = task_manager.add_task(task_content)
    return jsonify({"status": "success", "task": new_task})

@app.route("/update-task", methods=["POST"])
@login_required
def update_task():
    task_id = request.form.get("id")
    task_content = request.form.get("content")
    task_completed = request.form.get("completed")
    completed = task_completed.lower() == 'true' if task_completed else None

    task = task_manager.update_task(task_id, task_content, completed)
    if task:
        return jsonify({"status": "success", "task": task})
    return jsonify({"status": "error", "message": "Task not found"})

@app.route("/delete-task", methods=["POST"])
@login_required
def delete_task():
    task_id = request.form.get("id")
    if not task_id:
        return jsonify({"status": "error", "message": "Task ID is missing"})
    
    if task_manager.delete_task(task_id):
        return jsonify({"status": "success"})
    return jsonify({"status": "error", "message": "Task not found"})

if __name__ == "__main__":
    app.run(debug=True)