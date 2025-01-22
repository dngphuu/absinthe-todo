import json
import uuid
import os
from config import Config

class TaskManager:
    def __init__(self):
        self.data_file = Config.DATA_FILE
        self.tasks = []  # Initialize tasks first
        self.load_tasks()  # Then load existing tasks

    def load_tasks(self):
        if not os.path.exists(self.data_file):
            with open(self.data_file, "w") as f:
                json.dump([], f)
            return

        try:
            with open(self.data_file, "r") as f:
                content = f.read().strip()
                self.tasks = json.loads(content) if content else []
        except json.JSONDecodeError:
            self.tasks = []

    def save_tasks(self):  # Modified to use instance variable
        with open(self.data_file, "w") as f:
            json.dump(self.tasks, f, indent=2)

    def add_task(self, content):
        new_task = {
            "id": str(uuid.uuid4()),
            "content": content,
            "completed": False
        }
        self.tasks.append(new_task)
        self.save_tasks()
        return new_task

    def update_task(self, task_id, content=None, completed=None):
        for task in self.tasks:
            if task["id"] == task_id:
                if content is not None:
                    task["content"] = content
                if completed is not None:
                    task["completed"] = completed
                self.save_tasks()
                return task
        return None

    def delete_task(self, task_id):
        initial_length = len(self.tasks)
        self.tasks = [task for task in self.tasks if task["id"] != task_id]
        if len(self.tasks) != initial_length:
            self.save_tasks()
            return True
        return False
