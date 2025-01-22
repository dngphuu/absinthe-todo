//=============================================================================
// CONSTANTS & DOM ELEMENTS
//=============================================================================
// Add all DOM element references here

const userInfo = document.getElementById("user-info");
const logoutMenu = document.getElementById("logout-menu");
const taskInput = document.getElementById("task-input");
const addTaskIcon = document.getElementById("add-task-icon");
const taskList = document.getElementById("task-list");
const addTaskBtn = document.getElementById("add-task-btn");
const syncButton = document.getElementById("sync-button");

//=============================================================================
// USER INTERFACE CONTROLS
//=============================================================================
// User menu and logout functionality

/**
 * Toggle visibility of logout menu with animation
 */
function toggleLogoutMenu(show) {
  if (!userInfo || !logoutMenu) return;

  if (show) {
    logoutMenu.classList.remove("hidden");
    // Use requestAnimationFrame to ensure proper transition
    requestAnimationFrame(() => {
      logoutMenu.classList.remove("-translate-y-4", "opacity-0");
      logoutMenu.classList.add("translate-y-0", "opacity-100");
    });
  } else {
    logoutMenu.classList.add("-translate-y-4", "opacity-0");
    logoutMenu.classList.remove("translate-y-0", "opacity-100");
    setTimeout(() => logoutMenu.classList.add("hidden"), 300);
  }
}

if (userInfo && logoutMenu) {
  let isMenuOpen = false;

  userInfo.addEventListener("click", (e) => {
    e.stopPropagation();
    isMenuOpen = !isMenuOpen;
    toggleLogoutMenu(isMenuOpen);
  });

  // Handle keyboard navigation
  userInfo.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      isMenuOpen = !isMenuOpen;
      toggleLogoutMenu(isMenuOpen);
    } else if (e.key === "Escape" && isMenuOpen) {
      isMenuOpen = false;
      toggleLogoutMenu(false);
    }
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (
      isMenuOpen &&
      !userInfo.contains(e.target) &&
      !logoutMenu.contains(e.target)
    ) {
      isMenuOpen = false;
      toggleLogoutMenu(false);
    }
  });
}

//=============================================================================
// TASK INPUT HANDLING
//=============================================================================
// Task input and validation logic

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
// TASK OPERATIONS (CRUD)
//=============================================================================
// Task creation, update, and deletion functions

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
      class="task-content flex-1 outline-none px-1"
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

//=============================================================================
// EVENT LISTENERS
//=============================================================================
// All event listeners for task operations

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

/**
 * Event delegation for handling task content editing
 * Saves changes when user presses Enter or leaves the input field
 */
document.addEventListener("keypress", function (e) {
  if (e.target.classList.contains("task-content") && e.key === "Enter") {
    e.preventDefault();
    e.target.blur();
  }
});

document.addEventListener("focusout", function (e) {
  if (e.target.classList.contains("task-content")) {
    const taskId = e.target.closest("li").getAttribute("data-id");
    const content = e.target.value.trim();
    const completed = e.target
      .closest("li")
      .querySelector(".task-checkbox").checked;

    // Only update if content has changed and is not empty
    if (content !== "" && content !== e.target.defaultValue) {
      updateTask(taskId, content, completed);
      e.target.defaultValue = content; // Update default value to track changes
    } else if (content === "") {
      // Revert to previous value if empty
      e.target.value = e.target.defaultValue;
    }
  }
});

//=============================================================================
// UTILITY FUNCTIONS
//=============================================================================
// Helper functions for UI updates and data handling

/**
 * Shows loading state on sync button
 * @param {boolean} isLoading - Whether to show loading state
 * @returns {string} Original button content if loading is enabled
 */
function toggleSyncButtonLoading(isLoading) {
  if (!syncButton) return;

  const originalContent = syncButton.innerHTML;
  if (isLoading) {
    syncButton.disabled = true;
    syncButton.innerHTML = `
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="ml-2 font-rubik text-sm">Syncing...</span>
        `;
  } else {
    syncButton.disabled = false;
    syncButton.innerHTML = originalContent;
  }
  return originalContent;
}

/**
 * Syncs tasks with Google Drive
 * - Shows loading state
 * - Handles errors with user feedback
 * - Updates task list on success
 */
async function syncTasks() {
  if (!syncButton) return;

  const originalContent = `
        <svg class="h-6 w-6 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4"/>
        </svg>
        <span class="font-rubik text-sm text-white">Sync tasks</span>
    `;

  // Show loading state with consistent sizing
  syncButton.disabled = true;
  syncButton.innerHTML = `
        <svg class="h-6 w-6 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="ml-2 font-rubik text-sm text-white">Syncing...</span>
    `;

  try {
    const response = await fetch("/sync-tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === "success") {
      if (Array.isArray(data.tasks)) {
        taskList.innerHTML = "";
        data.tasks.forEach((task) => {
          const taskElement = createTaskElement(task);
          taskList.appendChild(taskElement);
        });
      }
      alert("Tasks synced successfully!");
    } else {
      throw new Error(data.message || "Sync failed");
    }
  } catch (error) {
    console.error("Error syncing tasks:", error);
    alert(`Sync failed: ${error.message}`);
  } finally {
    // Always restore original button state
    syncButton.disabled = false;
    syncButton.innerHTML = originalContent;
  }
}

// Update sync button event listener
if (syncButton) {
  syncButton.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await syncTasks();
  });
}
