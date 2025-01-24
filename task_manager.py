import json
import os
import logging
from pathlib import Path
from uuid import uuid4
from datetime import datetime
from typing import Dict, List, Optional, Any

class TaskManager:
    """Manages tasks with local storage and version control"""
    
    def __init__(self):
        self.tasks: List[Dict] = []
        self.last_sync: Optional[str] = None
        self.tasks_file = os.path.join(Path(__file__).parent, 'tasks.json')
        self._setup_logging()
        self.load_tasks()

    def _setup_logging(self) -> None:
        """Configure logging for the task manager"""
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger('TaskManager')

    #=============================================================================
    # Storage Operations
    #=============================================================================
    def load_tasks(self) -> List[Dict]:
        """Load tasks from local storage"""
        try:
            if os.path.exists(self.tasks_file):
                with open(self.tasks_file, 'r') as f:
                    content = f.read().strip()
                    if not content:  # Handle empty file
                        self.logger.info("Tasks file is empty, initializing with defaults")
                        self.save_tasks()  # Create initial structure
                        return self.tasks
                        
                    data = json.loads(content)
                    # Check if data is in the new format (dict with metadata)
                    if isinstance(data, dict):
                        self.tasks = data.get('tasks', [])
                        self.last_sync = data.get('last_sync')
                    else:
                        # Handle legacy format (list of tasks)
                        self.tasks = data if isinstance(data, list) else []
                        self.last_sync = None
                        # Migrate to new format
                        self.save_tasks()
                    
                self.logger.info(f"Loaded {len(self.tasks)} tasks")
            return self.tasks
        except Exception as e:
            self.logger.error(f"Error loading tasks: {str(e)}")
            return []

    def save_tasks(self) -> bool:
        """Save tasks to local storage"""
        try:
            current_time = datetime.now().isoformat()
            data = {
                'tasks': self.tasks,
                'last_sync': current_time
            }
            with open(self.tasks_file, 'w') as f:
                json.dump(data, f, indent=2)
            self.last_sync = current_time
            self.logger.info(f"Saved {len(self.tasks)} tasks at {current_time}")
            return True
        except Exception as e:
            self.logger.error(f"Error saving tasks: {str(e)}")
            return False

    #=============================================================================
    # Task Operations
    #=============================================================================
    def add_task(self, content: str) -> Dict:
        """Add a new task"""
        if not content or not content.strip():
            raise ValueError("Task content cannot be empty")
            
        task = {
            'id': str(uuid4()),
            'content': content.strip(),
            'completed': False,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            # Add default Eisenhower Matrix fields
            'urgency': 3,
            'importance': 3,
            'quadrant': 'Q4'
        }
        self.tasks.append(task)
        self.save_tasks()
        self.logger.info(f"Added task: {task['id']}")
        return task

    def update_task(self, task_id: str, content: Optional[str] = None, 
                    completed: Optional[bool] = None) -> Optional[Dict]:
        """Update an existing task"""
        for task in self.tasks:
            if str(task['id']) == str(task_id):
                if content is not None:
                    task['content'] = content
                if completed is not None:
                    task['completed'] = completed
                task['updated_at'] = datetime.now().isoformat()
                self.save_tasks()
                self.logger.info(f"Updated task: {task_id}")
                return task
        self.logger.warning(f"Task not found: {task_id}")
        return None

    def delete_task(self, task_id: str) -> bool:
        """Delete a task by ID"""
        initial_length = len(self.tasks)
        self.tasks = [t for t in self.tasks if str(t['id']) != str(task_id)]
        if len(self.tasks) < initial_length:
            self.save_tasks()
            self.logger.info(f"Deleted task: {task_id}")
            return True
        self.logger.warning(f"Task not found for deletion: {task_id}")
        return False

    #=============================================================================
    # Sync Operations
    #=============================================================================
    def merge_tasks(self, cloud_data: Dict[str, Any]) -> bool:
        """Merge cloud data with local data based on timestamps"""
        try:
            cloud_tasks = cloud_data.get('tasks', [])
            cloud_sync_time = cloud_data.get('last_sync')
            
            if not cloud_sync_time or (self.last_sync and self.last_sync >= cloud_sync_time):
                return False
            
            # Create maps for both local and cloud tasks
            local_tasks_map = {task['id']: task for task in self.tasks}
            cloud_tasks_map = {task['id']: task for task in cloud_tasks}
            
            # Merge tasks
            merged_tasks = []
            all_task_ids = set(local_tasks_map.keys()) | set(cloud_tasks_map.keys())
            
            for task_id in all_task_ids:
                local_task = local_tasks_map.get(task_id)
                cloud_task = cloud_tasks_map.get(task_id)
                
                if not local_task:
                    merged_tasks.append(cloud_task)
                elif not cloud_task:
                    merged_tasks.append(local_task)
                else:
                    local_updated = datetime.fromisoformat(local_task['updated_at'])
                    cloud_updated = datetime.fromisoformat(cloud_task['updated_at'])
                    merged_tasks.append(cloud_task if cloud_updated > local_updated else local_task)
            
            if merged_tasks != self.tasks:
                self.tasks = merged_tasks
                self.save_tasks()
                self.logger.info("Merged tasks with cloud version")
                return True
                
            return False
        except Exception as e:
            self.logger.error(f"Error merging tasks: {str(e)}")
            return False
