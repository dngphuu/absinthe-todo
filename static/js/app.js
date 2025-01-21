//=============================================================================
// USER INTERFACE CONTROLS
//=============================================================================

/**
 * Toggle visibility of logout menu with animation
 * Uses CSS transitions for smooth animation effects
 */
document.getElementById("user-info").addEventListener("click", function () {
  const LOGOUT_MENU = document.getElementById("logout-menu");

  if (LOGOUT_MENU.classList.contains("hidden")) {
    LOGOUT_MENU.classList.remove("hidden");
    setTimeout(() => {
      LOGOUT_MENU.classList.remove("-translate-y-4", "opacity-0");
      LOGOUT_MENU.classList.add("translate-y-0", "opacity-100");
    }, 10);
  } else {
    LOGOUT_MENU.classList.add("-translate-y-4", "opacity-0");
    LOGOUT_MENU.classList.remove("translate-y-0", "opacity-100");
    setTimeout(() => {
      LOGOUT_MENU.classList.add("hidden");
    }, 300);
  }
});

//=============================================================================
// TASK INPUT HANDLING
//=============================================================================

// DOM element references for task management
const taskInput = document.getElementById("task-input");
const addTaskIcon = document.getElementById("add-task-icon");
const taskList = document.getElementById("task-list");
const addTaskBtn = document.getElementById("add-task-btn");

/**
 * Changes add task button color based on input state
 * Blue (#3d72fe) when input has content, grey (#bdbdbd) when empty
 */
taskInput.addEventListener("input", function () {
  if (taskInput.value.trim() !== "") {
    addTaskIcon.style.fill = "#3d72fe";
  } else {
    addTaskIcon.style.fill = "#bdbdbd";
  }
});

//=============================================================================
// UI STYLING FUNCTIONS
//=============================================================================

/**
 * Resets the task input form to its initial state:
 * - Clears input field
 * - Removes focus
 * - Resets button color
 * - Resets underline style
 */
function resetStyles() {
  taskInput.value = ""; // Clear input
  taskInput.blur(); // Remove focus
  addTaskIcon.style.fill = "#bdbdbd"; // Reset button color
  const addTaskContainer = document.getElementById("add-task-container");
  addTaskContainer.classList.remove("after:bg-black"); // Reset line color
}

//=============================================================================
// TASK CREATION HANDLERS
//=============================================================================

/**
 * Handles task creation when Enter key is pressed
 * @param {KeyboardEvent} event - The keyboard event object
 */
taskInput.addEventListener("keypress", async function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    await handleAddTask();
  }
});

/**
 * Handles task creation when Add button is clicked
 */
addTaskBtn.addEventListener("click", async function () {
  await handleAddTask();
});

/**
 * Central function for handling task creation
 * - Validates input
 * - Sends POST request to server
 * - Updates UI on success
 * - Handles errors
 */
async function handleAddTask() {
  const taskContent = taskInput.value.trim();
  if (!taskContent) return;

  const formData = new FormData();
  formData.append("task", taskContent);

  try {
    const response = await fetch("/add-task", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.status === "success") {
      const taskElement = createTaskElement(data.task);
      taskList.appendChild(taskElement);
      resetStyles();
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Error adding task:", error);
    alert("An error occurred while adding the task.");
  }
}

//=============================================================================
// TASK ELEMENT CREATION
//=============================================================================

/**
 * Creates a new task list item element
 * @param {Object} task - Task object containing id, content, and completed status
 * @returns {HTMLLIElement} The created task list item element
 */
function createTaskElement(task) {
  const li = document.createElement("li");
  li.setAttribute("data-id", task.id);
  li.className =
    "task-item group relative flex w-full items-center justify-between py-1";
  li.innerHTML = `
    <input
      type="checkbox"
      class="task-checkbox mr-4 h-5 w-5 cursor-pointer"
      ${task.completed ? "checked" : ""}
    />
    <input
      type="text"
      value="${task.content}"
      class="task-content flex-1 outline-none"
    />
    <button
      class="task-delete p-2 transition-all duration-500 ease-in-out hover:rounded-full hover:bg-gray-100"
      title="Delete task"
      type="button"
    >
      <svg class="text-black-800 h-[24px] w-[24px]" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#de5246" viewBox="0 0 24 24">
        <path fill-rule="evenodd" d="M8.586 2.586A2 2 0 0 1 10 2h4a2 2 0 0 1 2 2v2h3a1 1 0 1 1 0 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a1 1 0 0 1 0-2h3V4a2 2 0 0 1 .586-1.414ZM10 6h4V4h-4v2Zm1 4a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Zm4 0a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Z" clip-rule="evenodd"/>
      </svg>
    </button>
  `;
  return li;
}

//=============================================================================
// TASK EVENT LISTENERS
//=============================================================================

/**
 * Event delegation for handling checkbox state changes
 * Updates task completion status on server
 */
document.addEventListener("change", function (e) {
  if (e.target.classList.contains("task-checkbox")) {
    const taskId = e.target.closest("li").getAttribute("data-id");
    const completed = e.target.checked;
    const content = e.target.closest("li").querySelector(".task-content").value;
    updateTask(taskId, content, completed);
  }
});

/**
 * Event delegation for handling task deletion
 * Removes task from both server and UI
 */
document.addEventListener("click", function (e) {
  if (e.target.closest(".task-delete")) {
    const taskId = e.target.closest("li").getAttribute("data-id");
    deleteTask(taskId);
  }
});

//=============================================================================
// TASK OPERATIONS
//=============================================================================

/**
 * Updates a task's content and completion status
 * @param {string} taskId - Task identifier
 * @param {string} updatedContent - New task content
 * @param {boolean} completed - New completion status
 * @throws {Error} When server communication fails
 */
async function updateTask(taskId, updatedContent, completed) {
  const formData = new FormData();
  formData.append("id", taskId);
  formData.append("content", updatedContent);
  formData.append("completed", completed);

  try {
    const response = await fetch("/update-task", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.status === "success") {
      // Update UI directly instead of reloading
      const taskElement = document.querySelector(`li[data-id='${taskId}']`);
      if (taskElement) {
        taskElement.querySelector(".task-content").value = data.task.content;
        taskElement.querySelector(".task-checkbox").checked =
          data.task.completed;
      }
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Error updating task:", error);
    alert("An error occurred while updating the task.");
  }
}

/**
 * Deletes a task from the system
 * @param {string} taskId - Task identifier
 * @throws {Error} When server communication fails
 */
async function deleteTask(taskId) {
  const formData = new FormData();
  formData.append("id", taskId);

  try {
    const response = await fetch("/delete-task", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.status === "success") {
      // Remove task element from DOM instead of reloading
      const taskElement = document.querySelector(`li[data-id='${taskId}']`);
      if (taskElement) {
        taskElement.remove();
      }
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Error deleting task:", error);
    alert("An error occurred while deleting the task.");
  }
}
