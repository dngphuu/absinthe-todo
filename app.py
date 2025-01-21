from flask import Flask, render_template, redirect, request, session, url_for, jsonify
import os
import json
import uuid

app = Flask(__name__, template_folder="templates")
app.secret_key = "Hello World"

def load_tasks():
    # Create data.json if not exists
    if not os.path.exists("data.json"):
        with open("data.json", "w") as f:
            json.dump([], f)
        return []
    
    # Handle empty file
    try:
        with open("data.json", "r") as f:
            content = f.read().strip()
            if not content:  # If file is empty
                return []
            return json.loads(content)
    except json.JSONDecodeError:  # If invalid JSON
        return []

def save_tasks(tasks):
    with open("data.json", "w") as f:
        json.dump(tasks, f, indent=2)


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
def index():
    if session.get('isAuth'):
        tasks = load_tasks() #Load tasks from data.json
        return render_template("index.html", tasks=tasks)
    return redirect(url_for("login"))
    
@app.route("/add-task", methods=["POST"])
def add_task():
    if not session.get('isAuth'):
        return redirect(url_for("login"))
    
    task_content = request.form.get("task")
    if task_content:
        tasks = load_tasks()
        new_task = {
            "id": str(uuid.uuid4()),
            "content": task_content,
            "completed": False
        }
        tasks.append(new_task)
        save_tasks(tasks)
        return jsonify({"status": "success", "task": new_task})
    return jsonify({"status": "error", "message": "Task content is required"})

@app.route("/update-task", methods=["POST"])
def update_task():
    if not session.get('isAuth'):  
        return redirect(url_for("login"))
    
    task_id = request.form.get("id")
    task_content = request.form.get("content")
    task_completed = request.form.get("completed")

    tasks = load_tasks()
    for task in tasks:
        if task["id"] == task_id:
            if task_content:
                task["content"] = task_content
            task["completed"] = task_completed.lower() == 'true'
            save_tasks(tasks)
            return jsonify({"status": "success", "task": task})
    return jsonify({"status": "error", "message": "Task not found"})

@app.route("/delete-task", methods=["POST"])
def delete_task():
    if not session.get('isAuth'):
        return redirect(url_for("login"))
    
    task_id = request.form.get("id")
    
    if not task_id:
        return jsonify({"status": "error", "message": "Task ID is missing"})
    
    tasks = load_tasks()
    updated_tasks = [task for task in tasks if task["id"] != task_id]
    
    if len(updated_tasks) != len(tasks):
        save_tasks(updated_tasks)
        return jsonify({"status": "success"})
    return jsonify({"status": "error", "message": "Task not found"})

if __name__ == "__main__":
    app.run(debug=True)