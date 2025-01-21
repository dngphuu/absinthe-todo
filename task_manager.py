import json
import uuid
import os
from config import Config

class TaskManager:
    def __init__(self):
        self.data_file = Config.DATA_FILE

    def load_tasks(self):
        if not os.path.exists(self.data_file):
            with open(self.data_file, "w") as f:
                json.dump([], f)
            return []
        
        try:
            with open(self.data_file, "r") as f:
                content = f.read().strip()
                return json.loads(content) if content else []
        except json.JSONDecodeError:
            return []

    def save_tasks(self, tasks):
        with open(self.data_file, "w") as f:
            json.dump(tasks, f, indent=2)

    def add_task(self, content):
        tasks = self.load_tasks()
        new_task = {
            "id": str(uuid.uuid4()),
            "content": content,
            "completed": False
        }
        tasks.append(new_task)
        self.save_tasks(tasks)
        return new_task

    def update_task(self, task_id, content=None, completed=None):
        tasks = self.load_tasks()
        for task in tasks:
            if task["id"] == task_id:
                if content is not None:
                    task["content"] = content
                if completed is not None:
                    task["completed"] = completed
                self.save_tasks(tasks)
                return task
        return None

    def delete_task(self, task_id):
        tasks = self.load_tasks()
        updated_tasks = [task for task in tasks if task["id"] != task_id]
        if len(updated_tasks) != len(tasks):
            self.save_tasks(updated_tasks)
            return True
        return False
