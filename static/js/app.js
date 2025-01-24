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

  handleSuccess(message) {
    alert(message);
  },

  isValidContent(content) {
    return typeof content === "string" && content.trim().length > 0;
  },

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
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
          "task-item group relative flex w-full items-center justify-between rounded-lg border border-gray-100 bg-white p-2 transition-all duration-200 hover:border-gray-200 hover:shadow-sm",
      },
      `
        <div class="flex items-center flex-1">
          <input
            type="checkbox"
            class="task-checkbox mr-4 h-5 w-5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            ${task.completed ? "checked" : ""}
          />
          <input
            type="text"
            value="${task.content}"
            class="task-content flex-1 bg-transparent px-1 outline-none transition-all duration-200 focus:bg-gray-50 rounded-md focus:px-2"
          />
          <span class="quadrant-indicator ml-2 hidden group-hover:inline-flex items-center text-sm"></span>
        </div>
        <div class="flex items-center space-x-1">
          <button
            class="task-delete p-2 text-gray-400 transition-all duration-300 hover:text-red-500 hover:rounded-full hover:bg-red-50"
            title="Delete task"
            type="button"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
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
    const input = document.querySelector(".task-input");
    const submitBtn = document.querySelector(".task-submit-btn");

    if (input) {
      input.value = "";
      input.blur();
    }
    if (submitBtn) {
      submitBtn.classList.remove("has-content");
    }
  },

  handleTaskInputFocus() {
    const inputContainer = document.querySelector('.task-input-container');
    const input = document.querySelector('.task-input');
    const submitBtn = document.querySelector('.task-submit-btn');

    // Add content state handler
    input.addEventListener('input', (e) => {
      const hasContent = e.target.value.trim().length > 0;
      submitBtn.classList.toggle('has-content', hasContent);

      if (hasContent) {
        submitBtn.classList.add('transform', 'scale-110');
        setTimeout(() => submitBtn.classList.remove('transform', 'scale-110'), 200);
      }
    });

    // Add floating animation
    input.addEventListener('focus', () => {
      inputContainer.style.transform = 'translateY(-4px)';
      inputContainer.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
    });

    input.addEventListener('blur', () => {
      inputContainer.style.transform = 'translateY(0)';
      inputContainer.style.boxShadow = '';
    });

    // Add ripple effect with better positioning
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Create ripple element regardless of input content
      const ripple = document.createElement('div');
      ripple.className = 'ripple';
      submitBtn.appendChild(ripple);

      // Get click coordinates relative to button
      const rect = submitBtn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Position ripple at click location
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      if (input.value.trim().length > 0) {
        // Add click feedback
        submitBtn.classList.add('scale-95');
        setTimeout(() => submitBtn.classList.remove('scale-95'), 200);
      } else {
        // Shake animation for empty input
        submitBtn.classList.add('animate-[wiggle_0.5s_ease-in-out]');
        setTimeout(() => submitBtn.classList.remove('animate-[wiggle_0.5s_ease-in-out]'), 500);
      }
      
      // Remove ripple after animation
      setTimeout(() => ripple.remove(), 600);
    });

    // Add hover effect when input has content
    input.addEventListener('input', () => {
      const hasContent = input.value.trim().length > 0;
      if (hasContent && !submitBtn.classList.contains('has-content')) {
        submitBtn.classList.add('has-content');
      } else if (!hasContent && submitBtn.classList.contains('has-content')) {
        submitBtn.classList.remove('has-content');
      }
    });
  },

  init() {
    this.handleTaskInputFocus();
    // ...existing init code...
  },
};

//=============================================================================
// MODULE: Sync Operations
//=============================================================================
const SyncManager = {
  setLoadingState(element, isLoading, loadingText = "Loading...", isSyncButton = false) {
    if (!element) return;
    
    if (isLoading) {
      element.disabled = true;
      if (isSyncButton) {
        element.classList.add('syncing');
        element.innerHTML = `
          <svg class="sync-icon h-6 w-6 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4"/>
          </svg>
          <span class="font-rubik text-sm text-white">${loadingText}</span>
        `;
      } else {
        element.innerHTML = `
          <span class="flex items-center space-x-2">
            <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-xs">${loadingText}</span>
          </span>
        `;
      }
    } else {
      element.disabled = false;
      if (isSyncButton) {
        element.classList.remove('syncing');
        element.innerHTML = `
          <svg class="sync-icon h-6 w-6 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4"/>
          </svg>
          <span class="font-rubik text-sm text-white">Sync tasks</span>
        `;
      } else {
        element.innerHTML = `
          <span class="flex items-center space-x-2">
            <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/>
            </svg>
            <span class="text-xs">Magic Sort</span>
          </span>
        `;
      }
    }
  },

  async syncTasks() {
    if (LoadingState.isLoading) return;

    const syncButton = DOM.get("sync-button");
    LoadingState.start(syncButton);
    this.setLoadingState(syncButton, true, "Syncing...", true);

    try {
      const response = await fetch("/sync-tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.status === "success" && Array.isArray(data.tasks)) {
        const taskList = DOM.get("taskList");
        taskList.innerHTML = "";
        data.tasks.forEach(task => {
          const taskElement = TaskManager.createTaskElement(task);
          taskList.appendChild(taskElement);
        });
        Utils.handleSuccess("Tasks synced successfully!");
      } else {
        throw new Error(data.message || "Sync failed");
      }
    } catch (error) {
      Utils.handleError(error, "Sync failed");
    } finally {
      // Add a small delay to ensure smooth transition
      await Utils.wait(300);
      LoadingState.stop(syncButton);
      this.setLoadingState(syncButton, false, null, true);
    }
  },
};

//=============================================================================
// MODULE: View Manager
//=============================================================================
const ViewManager = {
  currentView: "list", // 'list' or 'matrix'
  isTasksSorted: false,

  toggleView() {
    if (!this.isTasksSorted) return;

    const listView = DOM.get("task-list");
    const matrixView = DOM.get("matrix-view");
    const viewButton = DOM.get("view-toggle-button");

    // Toggle view type
    this.currentView = this.currentView === "list" ? "matrix" : "list";

    // Update button icon and text
    viewButton.innerHTML =
      this.currentView === "list"
        ? `<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/>
         </svg>
         <span class="text-xs">List View</span>`
        : `<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h16v16H4V4z M4 12h16 M12 4v16"/>
         </svg>
         <span class="text-xs">Matrix View</span>`;

    // Add transition classes
    listView.classList.add("view-list");
    matrixView.classList.add("view-matrix");

    // Animate transition with transform and opacity
    if (this.currentView === "matrix") {
      listView.style.transform = "translateY(-10px)";
      listView.style.opacity = "0";
      setTimeout(() => {
        listView.classList.add("hidden");
        matrixView.classList.remove("hidden");
        // Reset transform before animating in
        matrixView.style.transform = "translateY(10px)";
        matrixView.style.opacity = "0";
        // Force reflow
        matrixView.offsetHeight;
        // Animate in
        matrixView.style.transform = "translateY(0)";
        matrixView.style.opacity = "1";
        this.updateMatrixView();
      }, 300);
    } else {
      matrixView.style.transform = "translateY(-10px)";
      matrixView.style.opacity = "0";
      setTimeout(() => {
        matrixView.classList.add("hidden");
        listView.classList.remove("hidden");
        // Reset transform before animating in
        listView.style.transform = "translateY(10px)";
        listView.style.opacity = "0";
        // Force reflow
        listView.offsetHeight;
        // Animate in
        listView.style.transform = "translateY(0)";
        listView.style.opacity = "1";
      }, 300);
    }
  },

  updateMatrixView() {
    const tasks = Array.from(DOM.get("task-list").children);

    // Clear existing tasks in matrix
    document.querySelectorAll(".quadrant ul").forEach((ul) => (ul.innerHTML = ""));

    // Distribute tasks to quadrants with animations
    tasks.forEach((task, index) => {
      const quadrant = task.classList.contains("quadrant-q1")
        ? "q1"
        : task.classList.contains("quadrant-q2")
          ? "q2"
          : task.classList.contains("quadrant-q3")
            ? "q3"
            : "q4";

      const quadrantList = document.querySelector(`.${quadrant}-tasks`);
      if (quadrantList) {
        const clonedTask = task.cloneNode(true);
        
        // Add matrix-specific styles
        clonedTask.classList.add("opacity-0", "translate-x-2", "transition-all", "duration-300", "ease-in-out");
        
        // Remove any existing indicators
        const indicator = clonedTask.querySelector(".quadrant-indicator");
        if (indicator) {
          indicator.remove();
        }

        // Re-attach event listeners to cloned task
        const checkbox = clonedTask.querySelector(".task-checkbox");
        const content = clonedTask.querySelector(".task-content");
        const deleteBtn = clonedTask.querySelector(".task-delete");

        if (checkbox) {
          checkbox.addEventListener("change", () => {
            const taskId = clonedTask.getAttribute("data-id");
            const content = clonedTask.querySelector(".task-content").value;
            TaskManager.updateTask(taskId, content, checkbox.checked);
          });
        }

        if (content) {
          content.addEventListener("focusout", () => {
            const taskId = clonedTask.getAttribute("data-id");
            const newContent = content.value.trim();
            const completed = clonedTask.querySelector(".task-checkbox").checked;

            if (newContent !== "" && newContent !== content.defaultValue) {
              TaskManager.updateTask(taskId, newContent, completed);
              content.defaultValue = newContent;
            } else if (newContent === "") {
              content.value = content.defaultValue;
            }
          });

          content.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              content.blur();
            }
          });
        }

        if (deleteBtn) {
          deleteBtn.addEventListener("click", () => {
            const taskId = clonedTask.getAttribute("data-id");
            TaskManager.deleteTask(taskId);
          });
        }

        quadrantList.appendChild(clonedTask);

        // Animate task entrance with a slight delay based on index
        setTimeout(() => {
          clonedTask.classList.remove("opacity-0", "translate-x-2");
        }, index * 50);
      }
    });
  },

  enableViewToggle() {
    this.isTasksSorted = true;
    const viewButton = DOM.get("view-toggle-button");
    viewButton.disabled = false;
    viewButton.classList.remove("text-gray-400", "bg-gray-100");
    viewButton.classList.add(
      "text-gray-700",
      "bg-white",
      "border",
      "border-gray-200",
    );
  },
};

//=============================================================================
// MODULE: Magic Sort Operations
//=============================================================================
const MagicSortManager = {
  async sortTasks() {
    if (LoadingState.isLoading) return;

    const button = DOM.get("magic-sort-button");
    const taskList = DOM.get("taskList");
    
    try {
      LoadingState.start(button);
      button.classList.add('sorting');
      SyncManager.setLoadingState(button, true, "Sorting...");

      const response = await fetch("/magic-sort", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.status === "success" && Array.isArray(data.tasks)) {
        // Fade out and update tasks
        taskList.style.opacity = "0";
        await Utils.wait(300);

        // Update task list
        taskList.innerHTML = "";
        data.tasks.forEach(task => {
          const taskElement = TaskManager.createTaskElement(task);
          taskElement.classList.add(`quadrant-${task.quadrant.toLowerCase()}`);
          taskElement.style.opacity = "0";
          taskElement.style.transform = "translateX(-10px)";
          taskList.appendChild(taskElement);
        });

        // Fade in tasks sequentially
        await Utils.wait(100);
        taskList.style.opacity = "1";
        
        const tasks = Array.from(taskList.children);
        const animationPromises = tasks.map((task, index) => {
          return new Promise(resolve => {
            setTimeout(() => {
              task.style.transition = "all 300ms ease-in-out";
              task.style.opacity = "1";
              task.style.transform = "translateX(0)";
              resolve();
            }, index * 50);
          });
        });

        // Wait for all animations to complete
        await Promise.all(animationPromises);
        await Utils.wait(300); // Additional wait for final animation

        ViewManager.enableViewToggle();
        Utils.handleSuccess("Tasks sorted successfully!");
      } else {
        throw new Error(data.message || "Sort failed");
      }
    } catch (error) {
      Utils.handleError(error, "Sort failed");
    } finally {
      // Ensure loading states are cleared after all animations
      await Utils.wait(300); // Wait for animations to complete
      LoadingState.stop(button);
      button.classList.remove('sorting');
      SyncManager.setLoadingState(button, false);
    }
  },
};

//=============================================================================
// MODULE: Event Handlers
//=============================================================================
const EventHandlers = {
  init() {
    const taskInput = document.querySelector(".task-input");
    const addTaskBtn = document.querySelector(".task-submit-btn");

    // Task input handlers
    const handleTaskSubmit = async (e) => {
      e?.preventDefault();
      const content = taskInput.value.trim();
      if (content) {
        await TaskManager.createTask(content);
      }
    };

    if (taskInput) {
      taskInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleTaskSubmit(e);
      });
    }

    if (addTaskBtn) {
      addTaskBtn.addEventListener("click", handleTaskSubmit);
    }

    // Keep the rest of the event handlers
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
    if (DOM.get("sync-button")) {
      DOM.get("sync-button").addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await SyncManager.syncTasks();
      });
    }

    // Add magic sort button handler
    if (DOM.get("magic-sort-button")) {
      DOM.get("magic-sort-button").addEventListener("click", async (e) => {
        e.preventDefault();
        await MagicSortManager.sortTasks();
      });
    }

    // Add view toggle button handler
    if (DOM.get("view-toggle-button")) {
      DOM.get("view-toggle-button").addEventListener("click", () => {
        ViewManager.toggleView();
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
  TaskManager.init();
}
