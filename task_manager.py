import json
import os
from pathlib import Path
from uuid import uuid4

class TaskManager:
    def __init__(self):
        self.tasks = []
        self.tasks_file = os.path.join(Path(__file__).parent, 'tasks.json')

    def load_tasks(self):
        try:
            if os.path.exists(self.tasks_file):
                with open(self.tasks_file, 'r') as f:
                    self.tasks = json.load(f)
            return self.tasks or []  # Return empty list if tasks is None
        except Exception as e:
            print(f"Error loading tasks: {str(e)}")
            return []  # Return empty list on error

    def save_tasks(self):
        try:
            with open(self.tasks_file, 'w') as f:
                json.dump(self.tasks, f)
        except Exception as e:
            print(f"Error saving tasks: {str(e)}")

    def add_task(self, content):
        task = {
            'id': str(uuid4()),  # Use UUID instead of incremental number
            'content': content,
            'completed': False
        }
        self.tasks.append(task)
        self.save_tasks()
        return task

    def update_task(self, task_id, content=None, completed=None):
        for task in self.tasks:
            if str(task['id']) == str(task_id):
                if content is not None:
                    task['content'] = content
                if completed is not None:
                    task['completed'] = completed
                self.save_tasks()
                return task
        return None

    def delete_task(self, task_id):
        initial_length = len(self.tasks)
        self.tasks = [t for t in self.tasks if str(t['id']) != str(task_id)]
        if len(self.tasks) < initial_length:
            self.save_tasks()
            return True
        return False
