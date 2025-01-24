from typing import Dict, Any, List, Optional, TypedDict
from enum import Enum
import json
import os
from pathlib import Path
import logging
from datetime import datetime
from openai import OpenAI
from config import Config

# Initialize OpenAI client
client = OpenAI(api_key=Config.OPENAI_API_KEY)

class TaskData(TypedDict):
    """Type definition for task data"""
    tasks: List[Dict[str, Any]]
    last_sync: Optional[str]

class Quadrant(Enum):
    """Eisenhower Matrix Quadrants with descriptions"""
    Q1 = ("Q1", "Urgent & Important")
    Q2 = ("Q2", "Not Urgent & Important")
    Q3 = ("Q3", "Urgent & Not Important")
    Q4 = ("Q4", "Not Urgent & Not Important")

    def __init__(self, code: str, description: str):
        self.code = code
        self.description = description

class TaskPriority:
    """Task priority configuration"""
    LEVELS = {
        'urgency': {
            5: "Must do immediately/today",
            4: "Need to do in 1-2 days",
            3: "Need to do this week",
            2: "Need to do this month",
            1: "No specific deadline"
        },
        'importance': {
            5: "Critical impact on work/study",
            4: "Impacts long-term goals",
            3: "Affects daily life",
            2: "Minor impact",
            1: "Not important"
        }
    }
    THRESHOLDS = {'urgency': 4, 'importance': 4}
    DEFAULTS = {'urgency': 3, 'importance': 3, 'quadrant': Quadrant.Q4.code}

class MagicSort:
    """Task analyzer using OpenAI API and Eisenhower Matrix"""
    
    def __init__(self):
        """Initialize MagicSort with configuration"""
        self._initialize_config()

    def _initialize_config(self) -> None:
        """Set up configuration and logging"""
        self.tasks_file = Path(__file__).parent / 'tasks.json'
        
        # Configure logging
        self.logger = logging.getLogger('MagicSort')
        self.logger.setLevel(logging.INFO)

    @staticmethod
    def determine_quadrant(urgency: int, importance: int) -> str:
        """Determine the quadrant based on urgency and importance levels"""
        if urgency is None or importance is None:
            return None
            
        is_urgent = urgency >= TaskPriority.THRESHOLDS['urgency']
        is_important = importance >= TaskPriority.THRESHOLDS['importance']
        
        if is_urgent and is_important:
            return str(Quadrant.Q1.code)
        elif not is_urgent and is_important:
            return str(Quadrant.Q2.code)
        elif is_urgent and not is_important:
            return str(Quadrant.Q3.code)
        else:
            return str(Quadrant.Q4.code)

    def _construct_prompt(self, task_content: str) -> str:
        """Build the analysis prompt with detailed instructions"""
        urgency_levels = "\n".join(f"    - {value}: {desc}" 
                                for value, desc in TaskPriority.LEVELS['urgency'].items())
        importance_levels = "\n".join(f"    - {value}: {desc}" 
                                    for value, desc in TaskPriority.LEVELS['importance'].items())
        
        return f'''Analyze the following task and return a JSON object with:

1. urgency (scale 1-5):
{urgency_levels}

2. importance (scale 1-5):
{importance_levels}

3. quadrant (Q1/Q2/Q3/Q4) based on:
    Q1: Urgency ≥4 AND Importance ≥4 (Important & Urgent)
    Q2: Urgency <4 AND Importance ≥4 (Important, Not Urgent)
    Q3: Urgency ≥4 AND Importance <4 (Not Important but Urgent)
    Q4: Urgency <4 AND Importance <4 (Not Important, Not Urgent)

RETURN ONLY JSON: {{urgency: number, importance: number, quadrant: "Q1/Q2/Q3/Q4"}}
NO EXPLANATION. NO ADDITIONAL TEXT.

Task: "{task_content}"'''

    def categorize_task(self, task_content: str) -> Dict[str, Any]:
        """Analyze and categorize a task using OpenAI API"""
        if not task_content or not task_content.strip():
            return TaskPriority.DEFAULTS.copy()

        try:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a professional task analyzer. Always return JSON in the exact required format."},
                    {"role": "user", "content": self._construct_prompt(task_content)}
                ],
                temperature=0,
                max_tokens=100
            )
            
            try:
                result = json.loads(response.choices[0].message.content)
            except json.JSONDecodeError:
                self.logger.error("Invalid JSON response from API")
                return TaskPriority.DEFAULTS.copy()

            # Validate result structure
            if not all(k in result for k in ['urgency', 'importance']):
                self.logger.error("Missing required fields in API response")
                return TaskPriority.DEFAULTS.copy()

            # Ensure values are within valid ranges
            result['urgency'] = max(1, min(5, int(result['urgency'])))
            result['importance'] = max(1, min(5, int(result['importance'])))
            
            # Calculate quadrant based on validated values
            result['quadrant'] = str(self.determine_quadrant(
                result['urgency'],
                result['importance']
            ))
            
            self.logger.info(f"Task categorized successfully: {task_content[:50]}...")
            return result
            
        except Exception as e:
            self.logger.error(f"Categorization error: {str(e)}")
            return TaskPriority.DEFAULTS.copy()

    def _needs_categorization(self, task: Dict[str, Any]) -> bool:
        """Check if a task needs to be categorized"""
        return (
            'urgency' not in task or
            'importance' not in task or
            'quadrant' not in task
        )

    def process_tasks(self) -> Optional[TaskData]:
        """Process and sort all tasks"""
        try:
            data = self._read_tasks()
            tasks = data.get('tasks', [])
            
            # Process each task while preserving original data
            processed_tasks = []
            categorized_count = 0
            for task in tasks:
                task_copy = task.copy()  # Work on a copy to avoid modifying original
                if content := task_copy.get('content'):
                    if self._needs_categorization(task_copy):
                        categorization = self.categorize_task(content)
                        task_copy.update(categorization)
                        categorized_count += 1
                    # Recalculate quadrant based on urgency and importance
                    elif 'urgency' in task_copy and 'importance' in task_copy:
                        task_copy['quadrant'] = str(self.determine_quadrant(task_copy['urgency'], task_copy['importance']))
                    processed_tasks.append(task_copy)
            
            # Sort tasks but don't add quadrant_class
            sorted_tasks = self._sort_tasks(processed_tasks)
            
            output_data = {
                'tasks': sorted_tasks,
                'last_sync': data.get('last_sync') or datetime.now().isoformat()
            }
            
            if self._save_tasks(output_data):
                self.logger.info(f"Processed {categorized_count} uncategorized tasks out of {len(processed_tasks)} total tasks")
                return output_data
            
            return None
            
        except Exception as e:
            self.logger.error(f"Task processing error: {str(e)}")
            return None

    def _read_tasks(self) -> TaskData:
        """Read and parse tasks file safely"""
        try:
            if self.tasks_file.exists():
                with open(self.tasks_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            self.logger.warning(f"Error reading tasks file: {str(e)}")
        return {'tasks': [], 'last_sync': None}

    def _save_tasks(self, data: TaskData) -> bool:
        """Save tasks data to file"""
        try:
            with open(self.tasks_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            self.logger.error(f"Error saving tasks file: {str(e)}")
            return False

    def _sort_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Sort tasks by quadrant and priority levels"""
        quadrant_order = {q.code: i for i, q in enumerate(Quadrant)}
        return sorted(
            tasks,
            key=lambda x: (
                quadrant_order.get(x.get('quadrant'), 999),
                -x.get('urgency', 0),
                -x.get('importance', 0)
            )
        )
