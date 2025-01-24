from typing import Dict, Any, List, Optional, TypedDict
from enum import Enum
import json
import os
from pathlib import Path
import logging
from datetime import datetime
import openai
from config import Config

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
            5: "Cần làm ngay lập tức/hôm nay",
            4: "Cần làm trong 1-2 ngày",
            3: "Cần làm trong tuần này",
            2: "Cần làm trong tháng này",
            1: "Không có thời hạn cụ thể"
        },
        'importance': {
            5: "Ảnh hưởng quan trọng đến công việc/học tập",
            4: "Ảnh hưởng đến mục tiêu dài hạn",
            3: "Ảnh hưởng đến cuộc sống hàng ngày",
            2: "Ít ảnh hưởng",
            1: "Không quan trọng"
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
        openai.api_key = Config.OPENAI_API_KEY
        self.input_file = Path(__file__).parent / 'tasks.json'
        self.output_file = Path(__file__).parent / 'sorted_tasks.json'
        
        # Configure logging
        self.logger = logging.getLogger('MagicSort')
        self.logger.setLevel(logging.INFO)

    @staticmethod
    def determine_quadrant(urgency: int, importance: int) -> str:
        """Determine the quadrant based on urgency and importance levels"""
        is_urgent = urgency >= TaskPriority.THRESHOLDS['urgency']
        is_important = importance >= TaskPriority.THRESHOLDS['importance']
        
        if is_urgent and is_important:
            return Quadrant.Q1.code
        elif not is_urgent and is_important:
            return Quadrant.Q2.code
        elif is_urgent and not is_important:
            return Quadrant.Q3.code
        else:
            return Quadrant.Q4.code

    def _construct_prompt(self, task_content: str) -> str:
        """Build the analysis prompt with detailed instructions"""
        urgency_levels = "\n".join(f"    - {value}: {desc}" 
                                for value, desc in TaskPriority.LEVELS['urgency'].items())
        importance_levels = "\n".join(f"    - {value}: {desc}" 
                                    for value, desc in TaskPriority.LEVELS['importance'].items())
        
        return f'''Với task sau, PHÂN TÍCH và TRẢ VỀ một JSON object với:
1. urgency (số từ 1-5):
{urgency_levels}

2. importance (số từ 1-5):
{importance_levels}

3. quadrant (Q1/Q2/Q3/Q4) dựa trên:
    Q1: Urgency ≥4 VÀ Importance ≥4 (Quan trọng và Khẩn cấp)
    Q2: Urgency <4 VÀ Importance ≥4 (Quan trọng không Khẩn cấp)  
    Q3: Urgency ≥4 VÀ Importance <4 (Không quan trọng nhưng Khẩn cấp)
    Q4: Urgency <4 VÀ Importance <4 (Không quan trọng không Khẩn cấp)

CHỈ TRẢ VỀ JSON object với format: {{urgency: số, importance: số, quadrant: "Q1/Q2/Q3/Q4"}}
KHÔNG GIẢI THÍCH. KHÔNG THÊM TEXT.

Task: "{task_content}"'''

    def categorize_task(self, task_content: str) -> Dict[str, Any]:
        """Analyze and categorize a task using OpenAI API"""
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Bạn là trợ lý phân tích task chuyên nghiệp. Luôn trả về JSON chính xác theo format yêu cầu."},
                    {"role": "user", "content": self._construct_prompt(task_content)}
                ],
                temperature=0,
                max_tokens=100
            )
            
            result = json.loads(response.choices[0].message['content'])
            
            # Validate and ensure quadrant matches urgency/importance values
            calculated_quadrant = self.determine_quadrant(
                result['urgency'], 
                result['importance']
            )
            result['quadrant'] = calculated_quadrant
            
            self.logger.info(f"Task categorized: {task_content[:50]}...")
            return result
            
        except Exception as e:
            self.logger.error(f"Categorization error: {str(e)}")
            return TaskPriority.DEFAULTS.copy()

    def process_tasks(self) -> Optional[TaskData]:
        """Process and sort all tasks from input file"""
        try:
            # Read and process tasks
            data = self._read_input_file()
            tasks = data.get('tasks', [])
            
            # Process each task
            processed_tasks = []
            for task in tasks:
                if content := task.get('content'):
                    categorization = self.categorize_task(content)
                    task.update(categorization)
                    processed_tasks.append(task)
            
            # Sort and save results
            sorted_tasks = self._sort_tasks(processed_tasks)
            output_data = {
                'tasks': sorted_tasks,
                'last_sync': data.get('last_sync') or datetime.now().isoformat()
            }
            
            if self._save_output_file(output_data):
                self.logger.info(f"Processed {len(processed_tasks)} tasks successfully")
                return output_data
            
            return None
            
        except Exception as e:
            self.logger.error(f"Task processing error: {str(e)}")
            return None

    def _read_input_file(self) -> TaskData:
        """Read and parse input file safely"""
        try:
            if self.input_file.exists():
                with open(self.input_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            self.logger.warning(f"Error reading input file: {str(e)}")
        return {'tasks': [], 'last_sync': None}

    def _save_output_file(self, data: TaskData) -> bool:
        """Save processed data to output file"""
        try:
            with open(self.output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            self.logger.error(f"Error saving output file: {str(e)}")
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
