//=============================================================================
// UTILITIES
//=============================================================================
const Utils = {
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  handleError(error, customMessage = "An error occurred") {
    console.error(error);
    alert(`${customMessage}: ${error.message}`);
  },

  isValidContent(content) {
    return typeof content === "string" && content.trim().length > 0;
  },
};

//=============================================================================
// MODULE: Loading State Manager
//=============================================================================
const LoadingState = {
  isLoading: false,
  elements: new Set(),

  start(element) {
    if (!element) return;
    this.isLoading = true;
    this.elements.add(element);
    element.disabled = true;
    element.classList.add("opacity-50", "cursor-wait");
  },

  stop(element) {
    if (!element) return;
    this.isLoading = false;
    this.elements.delete(element);
    element.disabled = false;
    element.classList.remove("opacity-50", "cursor-wait");
  },
};

//=============================================================================
// MODULE: DOM Elements
//=============================================================================
const DOM = {
  elements: {
    userInfo: document.getElementById("user-info"),
    logoutMenu: document.getElementById("logout-menu"),
    taskInput: document.getElementById("task-input"),
    addTaskIcon: document.getElementById("add-task-icon"),
    taskList: document.getElementById("task-list"),
    addTaskBtn: document.getElementById("add-task-btn"),
    syncButton: document.getElementById("sync-button"),
  },

  get(id) {
    return this.elements[id] || document.getElementById(id);
  },

  create(tag, attributes = {}, content = "") {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    if (content) element.innerHTML = content;
    return element;
  },
};

//=============================================================================
// MODULE: User Interface Controls
//=============================================================================
/**
 * Controls the visibility and animation of the logout menu
 */
const UserMenuController = {
  isMenuOpen: false,

  toggleLogoutMenu(show) {
    if (!DOM.get("userInfo") || !DOM.get("logoutMenu")) return;

    if (show) {
      DOM.get("logoutMenu").classList.remove("hidden");
      // Use requestAnimationFrame to ensure proper transition
      requestAnimationFrame(() => {
        DOM.get("logoutMenu").classList.remove("-translate-y-4", "opacity-0");
        DOM.get("logoutMenu").classList.add("translate-y-0", "opacity-100");
      });
    } else {
      DOM.get("logoutMenu").classList.add("-translate-y-4", "opacity-0");
      DOM.get("logoutMenu").classList.remove("translate-y-0", "opacity-100");
      setTimeout(() => DOM.get("logoutMenu").classList.add("hidden"), 300);
    }
  },

  init() {
    if (!DOM.get("userInfo") || !DOM.get("logoutMenu")) return;

    // Click handler
    DOM.get("userInfo").addEventListener("click", (e) => {
      e.stopPropagation();
      this.isMenuOpen = !this.isMenuOpen;
      this.toggleLogoutMenu(this.isMenuOpen);
    });

    // Keyboard navigation
    DOM.get("userInfo").addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.isMenuOpen = !this.isMenuOpen;
        this.toggleLogoutMenu(this.isMenuOpen);
      } else if (e.key === "Escape" && this.isMenuOpen) {
        this.isMenuOpen = false;
        this.toggleLogoutMenu(false);
      }
    });

    // Outside click handler
    document.addEventListener("click", (e) => {
      if (
        this.isMenuOpen &&
        !DOM.get("userInfo").contains(e.target) &&
        !DOM.get("logoutMenu").contains(e.target)
      ) {
        this.isMenuOpen = false;
        this.toggleLogoutMenu(false);
      }
    });
  },
};

//=============================================================================
// MODULE: Task Operations
//=============================================================================
const TaskManager = {
  /**
   * Creates a new task
   */
  async createTask(taskContent) {
    if (!Utils.isValidContent(taskContent)) return;

    LoadingState.start(DOM.get("add-task-btn"));
    const formData = new FormData();
    formData.append("task", taskContent);

    try {
      const response = await fetch("/add-task", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.status === "success") {
        const taskElement = this.createTaskElement(data.task);
        DOM.get("taskList").appendChild(taskElement);
        this.resetStyles();
      } else {
        alert(data.message);
      }
    } catch (error) {
      Utils.handleError(error, "Failed to create task");
    } finally {
      LoadingState.stop(DOM.get("add-task-btn"));
    }
  },

  /**
   * Updates an existing task
   */
  async updateTask(taskId, updatedContent, completed) {
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
  },

  /**
   * Deletes a task
   */
  async deleteTask(taskId) {
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
  },

  /**
   * Creates DOM element for a task
   */
  createTaskElement(task) {
    return DOM.create(
      "li",
      {
        "data-id": task.id,
        class:
          "task-item group relative flex w-full items-center justify-between py-1",
      },
      `
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
        `,
    );
  },

  /**
   * Resets the task input form to its initial state:
   * - Clears input field
   * - Removes focus
   * - Resets button color
   * - Resets underline style
   */
  resetStyles() {
    DOM.get("taskInput").value = ""; // Clear input
    DOM.get("taskInput").blur(); // Remove focus
    DOM.get("addTaskIcon").style.fill = "#bdbdbd"; // Reset button color
    const addTaskContainer = document.getElementById("add-task-container");
    addTaskContainer.classList.remove("after:bg-black"); // Reset line color
  },
};

//=============================================================================
// MODULE: Sync Operations
//=============================================================================
const SyncManager = {
  toggleLoading(isLoading) {
    if (!DOM.get("syncButton")) return;

    const originalContent = DOM.get("syncButton").innerHTML;
    if (isLoading) {
      DOM.get("syncButton").disabled = true;
      DOM.get("syncButton").innerHTML = `
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="ml-2 font-rubik text-sm">Syncing...</span>
            `;
    } else {
      DOM.get("syncButton").disabled = false;
      DOM.get("syncButton").innerHTML = originalContent;
    }
    return originalContent;
  },

  async syncTasks() {
    if (LoadingState.isLoading) return;

    LoadingState.start(DOM.get("sync-button"));
    const originalContent = `
            <svg class="h-6 w-6 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4"/>
            </svg>
            <span class="font-rubik text-sm text-white">Sync tasks</span>
        `;

    // Show loading state with consistent sizing
    DOM.get("syncButton").disabled = true;
    DOM.get("syncButton").innerHTML = `
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
          DOM.get("taskList").innerHTML = "";
          data.tasks.forEach((task) => {
            const taskElement = TaskManager.createTaskElement(task);
            DOM.get("taskList").appendChild(taskElement);
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
      LoadingState.stop(DOM.get("sync-button"));
      DOM.get("syncButton").innerHTML = originalContent;
    }
  },
};

//=============================================================================
// MODULE: Event Handlers
//=============================================================================
const EventHandlers = {
  init() {
    // Debounce input handler
    const debouncedInputHandler = Utils.debounce(function (e) {
      DOM.get("addTaskIcon").style.fill = e.target.value.trim()
        ? "#3d72fe"
        : "#bdbdbd";
    }, 100);

    DOM.get("taskInput").addEventListener("input", debouncedInputHandler);

    DOM.get("taskInput").addEventListener("keypress", async function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        await TaskManager.createTask(DOM.get("taskInput").value.trim());
      }
    });

    DOM.get("addTaskBtn").addEventListener("click", async function () {
      await TaskManager.createTask(DOM.get("taskInput").value.trim());
    });

    // Task operations handlers
    document.addEventListener("change", function (e) {
      if (e.target.classList.contains("task-checkbox")) {
        const taskId = e.target.closest("li").getAttribute("data-id");
        const completed = e.target.checked;
        const content = e.target
          .closest("li")
          .querySelector(".task-content").value;
        TaskManager.updateTask(taskId, content, completed);
      }
    });

    document.addEventListener("click", function (e) {
      if (e.target.closest(".task-delete")) {
        const taskId = e.target.closest("li").getAttribute("data-id");
        TaskManager.deleteTask(taskId);
      }
    });

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
          TaskManager.updateTask(taskId, content, completed);
          e.target.defaultValue = content; // Update default value to track changes
        } else if (content === "") {
          // Revert to previous value if empty
          e.target.value = e.target.defaultValue;
        }
      }
    });

    // Sync button handler
    if (DOM.get("syncButton")) {
      DOM.get("syncButton").addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await SyncManager.syncTasks();
      });
    }
  },
};

//=============================================================================
// Initialize Application
//=============================================================================
// Start the application when DOM is ready
document.addEventListener("DOMContentLoaded", initializeApp);

function initializeApp() {
  UserMenuController.init();
  EventHandlers.init();
}
