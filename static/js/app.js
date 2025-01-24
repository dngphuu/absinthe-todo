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
    NotificationManager.show(`${customMessage}: ${error.message}`, "error");
  },

  handleSuccess(message) {
    NotificationManager.show(message, "success");
  },

  isValidContent(content) {
    return typeof content === "string" && content.trim().length > 0;
  },

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    const userInfo = DOM.get("userInfo");
    const logoutMenu = DOM.get("logoutMenu");

    if (!userInfo || !logoutMenu) return;

    if (show) {
      logoutMenu.classList.remove("hidden");
      userInfo.classList.add("menu-open");
      // Use requestAnimationFrame for smooth animation
      requestAnimationFrame(() => {
        logoutMenu.classList.add("menu-enter", "visible");
        logoutMenu.classList.remove("-translate-y-4", "opacity-0");
      });
    } else {
      userInfo.classList.remove("menu-open");
      logoutMenu.classList.remove("visible");
      logoutMenu.classList.add("-translate-y-4", "opacity-0");
      // Add transition end handler
      const handleTransitionEnd = () => {
        if (!this.isMenuOpen) {
          logoutMenu.classList.add("hidden");
          logoutMenu.classList.remove("menu-enter");
        }
        logoutMenu.removeEventListener("transitionend", handleTransitionEnd);
      };
      logoutMenu.addEventListener("transitionend", handleTransitionEnd);
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
        const taskList = DOM.get("taskList");

        taskList.appendChild(taskElement);
        this.animateTaskElement(taskElement);

        this.resetStyles();

        // Update matrix view if needed
        if (ViewManager.currentView === "matrix") {
          ViewManager.updateMatrixView();
        }
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
  getTaskBaseClasses(quadrant, isMatrixView = false) {
    const baseClasses = [
      "task-item",
      "group",
      "relative",
      "flex",
      "w-full",
      "items-center",
      "justify-between",
      "rounded-lg",
      "border",
      "p-3",
      "transition-all",
      "duration-200",
      quadrant ? `quadrant-${quadrant.toLowerCase()}` : "",
    ];

    // Add view-specific classes
    if (isMatrixView) {
      baseClasses.push("hover:translate-y-[-2px]", "hover:shadow-md");
    } else {
      baseClasses.push(
        "hover:translate-x-1",
        "hover:border-blue-100/50",
        "hover:shadow-md",
      );
    }

    return baseClasses.filter(Boolean);
  },

  createTaskElement(task) {
    const element = DOM.create(
      "li",
      {
        "data-id": task.id,
        "data-quadrant": task.quadrant,
        // Remove opacity-0 from initial class and don't add transition classes here
        class: this.getTaskBaseClasses(task.quadrant).join(" "),
      },
      `
        <div class="flex items-center flex-1">
          <input
            type="checkbox"
            class="task-checkbox mr-4 h-5 w-5 cursor-pointer rounded border-gray-300 text-[#3d72fe] focus:ring-[#3d72fe]"
            ${task.completed ? "checked" : ""}
          />
          <input
            type="text"
            value="${task.content}"
            class="task-content flex-1 bg-transparent px-1 outline-none transition-all duration-200 focus:bg-gray-50 rounded-md focus:px-2"
          />
          ${
            task.quadrant
              ? `
            <span class="quadrant-indicator ml-2 hidden group-hover:inline-flex items-center text-sm text-gray-500">
              ${task.quadrant}
            </span>
          `
              : ""
          }
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

    // Remove the requestAnimationFrame animation code here
    // (We'll handle animations in the calling functions)

    return element;
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
    const inputContainer = document.querySelector(".task-input-container");
    const input = document.querySelector(".task-input");
    const submitBtn = document.querySelector(".task-submit-btn");

    // Add content state handler
    input.addEventListener("input", (e) => {
      const hasContent = e.target.value.trim().length > 0;
      submitBtn.classList.toggle("has-content", hasContent);

      if (hasContent) {
        submitBtn.classList.add("transform", "scale-110");
        setTimeout(
          () => submitBtn.classList.remove("transform", "scale-110"),
          200,
        );
      }
    });

    // Add floating animation
    input.addEventListener("focus", () => {
      inputContainer.style.transform = "translateY(-4px)";
      inputContainer.style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)";
    });

    input.addEventListener("blur", () => {
      inputContainer.style.transform = "translateY(0)";
      inputContainer.style.boxShadow = "";
    });

    // Add ripple effect with better positioning
    submitBtn.addEventListener("click", (e) => {
      e.preventDefault();

      // Create ripple element regardless of input content
      const ripple = document.createElement("div");
      ripple.className = "ripple";
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
        submitBtn.classList.add("scale-95");
        setTimeout(() => submitBtn.classList.remove("scale-95"), 200);
      } else {
        // Shake animation for empty input
        submitBtn.classList.add("animate-[wiggle_0.5s_ease-in-out]");
        setTimeout(
          () => submitBtn.classList.remove("animate-[wiggle_0.5s_ease-in-out]"),
          500,
        );
      }

      // Remove ripple after animation
      setTimeout(() => ripple.remove(), 600);
    });

    // Add hover effect when input has content
    input.addEventListener("input", () => {
      const hasContent = input.value.trim().length > 0;
      if (hasContent && !submitBtn.classList.contains("has-content")) {
        submitBtn.classList.add("has-content");
      } else if (!hasContent && submitBtn.classList.contains("has-content")) {
        submitBtn.classList.remove("has-content");
      }
    });
  },

  init() {
    this.handleTaskInputFocus();
  },

  animateTaskElement(taskElement, index = 0) {
    taskElement.classList.add("task-enter");
    taskElement.style.transitionDelay = `${index * 50}ms`;

    // Force reflow
    taskElement.offsetHeight;

    requestAnimationFrame(() => {
      taskElement.classList.add("task-enter-active");
      taskElement.classList.remove("task-enter");

      // Cleanup
      taskElement.addEventListener(
        "transitionend",
        () => {
          taskElement.classList.remove("task-enter-active");
          taskElement.style.transitionDelay = "";
        },
        { once: true },
      );
    });
  },

  async updateTaskList(tasks, container) {
    // Fade out container if it has content
    if (container.children.length > 0) {
      container.classList.add("task-container-fade");
      container.style.opacity = "0";
      await Utils.wait(200);
    }

    // Clear and add new tasks
    container.innerHTML = "";

    // Create all tasks first
    const taskElements = tasks.map((task) => this.createTaskElement(task));

    // Add all tasks to DOM
    taskElements.forEach((element) => {
      element.style.opacity = "0";
      element.style.transform = "translateY(15px)";
      container.appendChild(element);
    });

    // Show container
    container.style.opacity = "1";

    // Animate tasks sequentially
    await Utils.wait(50); // Small delay for better visual effect

    taskElements.forEach((task, index) => {
      setTimeout(() => {
        task.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        task.style.opacity = "1";
        task.style.transform = "translateY(0)";

        // Cleanup after animation
        task.addEventListener(
          "transitionend",
          () => {
            task.style.transition = "";
            task.style.transform = "";
          },
          { once: true },
        );
      }, index * 50);
    });

    return new Promise((resolve) => {
      const lastIndex = taskElements.length - 1;
      if (lastIndex >= 0) {
        setTimeout(resolve, lastIndex * 50 + 300);
      } else {
        resolve();
      }
    });
  },
};

//=============================================================================
// MODULE: Sync Operations
//=============================================================================
const SyncManager = {
  syncInProgress: false,

  async syncTasks(silent = false) {
    if (LoadingState.isLoading || this.syncInProgress) return;
    this.syncInProgress = true;

    const syncButton = DOM.get("sync-button");
    LoadingState.start(syncButton);
    syncButton.classList.add("syncing");

    // Store reference to loading notification
    const loadingNotification = NotificationManager.showLoading(
      "Syncing tasks...",
      "Please wait while we sync your tasks",
    );

    try {
      const response = await fetch("/sync-tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.status === "success" && Array.isArray(data.tasks)) {
        await TaskManager.updateTaskList(data.tasks, DOM.get("taskList"));

        // Update last synced time
        const lastSyncedSpan = document.getElementById("last-synced");
        if (lastSyncedSpan) {
          const now = new Date();
          lastSyncedSpan.textContent = `${now.toLocaleTimeString()}`;
        }

        // Update matrix view if active
        if (ViewManager.currentView === "matrix") {
          ViewManager.updateMatrixView();
        }

        // Remove loading notification before showing success
        if (loadingNotification) {
          loadingNotification.classList.add("removing");
          await new Promise((resolve) => {
            loadingNotification.addEventListener("animationend", () => {
              loadingNotification.remove();
              resolve();
            });
          });
        }

        // Show success notification
        NotificationManager.show("Tasks synced successfully!", "success");
      } else {
        throw new Error(data.message || "Sync failed");
      }
    } catch (error) {
      // Remove loading notification before showing error
      if (loadingNotification) {
        loadingNotification.remove();
      }
      if (!silent) {
        Utils.handleError(error, "Sync failed");
      }
    } finally {
      await Utils.wait(300);
      LoadingState.stop(syncButton);
      syncButton.classList.remove("syncing");
      this.syncInProgress = false;
      if (!silent) {
        UserMenuController.toggleLogoutMenu(false);
      }
    }
  },
};

//=============================================================================
// MODULE: View Manager
//=============================================================================
const ViewManager = {
  currentView: "list", // 'list' or 'matrix'

  updateViewButton() {
    const viewButton = DOM.get("view-toggle-button");
    const isListView = this.currentView === "list";

    viewButton.innerHTML = isListView
      ? `<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h16v16H4V4z M4 12h16 M12 4v16"/>
         </svg>
         <span class="text-xs">Matrix View</span>`
      : `<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/>
         </svg>
         <span class="text-xs">List View</span>`;
  },

  toggleView() {
    const listView = DOM.get("task-list");
    const matrixView = DOM.get("matrix-view");

    // Update matrix view before animation if switching to matrix
    if (this.currentView === "list") {
      this.updateMatrixView();
    } else {
      // Restore list view animations
      this.restoreListView();
    }

    // Toggle view type
    this.currentView = this.currentView === "list" ? "matrix" : "list";
    this.updateViewButton();

    // Add transition classes
    listView.classList.add("view-list");
    matrixView.classList.add("view-matrix");

    // Animate transition
    if (this.currentView === "matrix") {
      requestAnimationFrame(() => {
        listView.style.transform = "translateY(-10px)";
        listView.style.opacity = "0";
        setTimeout(() => {
          listView.classList.add("hidden");
          matrixView.classList.remove("hidden");
          matrixView.style.opacity = "0";
          matrixView.style.transform = "translateY(10px)";

          // Force reflow
          matrixView.offsetHeight;

          // Animate in
          matrixView.style.transform = "translateY(0)";
          matrixView.style.opacity = "1";
        }, 300);
      });
    } else {
      matrixView.style.transform = "translateY(-10px)";
      matrixView.style.opacity = "0";
      setTimeout(() => {
        matrixView.classList.add("hidden");
        listView.classList.remove("hidden");
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

  restoreListView() {
    const tasks = Array.from(DOM.get("task-list").children);
    tasks.forEach((task) => {
      const quadrant = task.getAttribute("data-quadrant");
      // Re-apply base classes to ensure consistent padding and styles
      task.className = TaskManager.getTaskBaseClasses(quadrant, false).join(
        " ",
      );
    });
  },

  updateMatrixView() {
    const tasks = Array.from(DOM.get("task-list").children);
    const quadrants = document.querySelectorAll(".quadrant ul");

    quadrants.forEach((ul) => (ul.innerHTML = ""));

    tasks.forEach((task, index) => {
      const taskQuadrant = task.getAttribute("data-quadrant");
      if (!taskQuadrant) return;

      const quadrant = taskQuadrant.toLowerCase();
      const quadrantList = document.querySelector(`.${quadrant}-tasks`);
      if (!quadrantList) return;

      const clonedTask = task.cloneNode(true);

      // Use consistent base classes with matrix-specific animations
      clonedTask.className = TaskManager.getTaskBaseClasses(quadrant, true)
        .concat(["opacity-0"])
        .join(" ");

      // Remove quadrant indicator and simplify content
      const indicator = clonedTask.querySelector(".quadrant-indicator");
      if (indicator) indicator.remove();

      // Add subtle completed state styling
      const checkbox = clonedTask.querySelector(".task-checkbox");
      const content = clonedTask.querySelector(".task-content");
      if (checkbox && checkbox.checked) {
        content.classList.add("line-through", "text-gray-400");
      }

      // Re-attach event listeners with modified behavior
      if (checkbox) {
        checkbox.addEventListener("change", () => {
          const taskId = clonedTask.getAttribute("data-id");
          const content = clonedTask.querySelector(".task-content");

          if (checkbox.checked) {
            content.classList.add("line-through", "text-gray-400");
          } else {
            content.classList.remove("line-through", "text-gray-400");
          }

          TaskManager.updateTask(taskId, content.value, checkbox.checked);
        });
      }

      // ...rest of the event listener code...

      quadrantList.appendChild(clonedTask);

      // Smoother entrance animation
      requestAnimationFrame(() => {
        setTimeout(() => {
          clonedTask.classList.remove("opacity-0");
          clonedTask.classList.add(
            "transform",
            "transition-all",
            "duration-300",
            "ease-out",
          );
        }, index * 40);
      });
    });
  },

  init() {
    this.updateViewButton();
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
      button.classList.add("sorting");

      const response = await fetch("/magic-sort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.status === "success" && Array.isArray(data.tasks)) {
        await TaskManager.updateTaskList(data.tasks, DOM.get("taskList"));

        // Update matrix view if needed
        if (ViewManager.currentView === "matrix") {
          ViewManager.updateMatrixView();
        }

        ViewManager.updateViewButton();
        Utils.handleSuccess("Tasks sorted successfully!");
      } else {
        throw new Error(data.message || "Sort failed");
      }
    } catch (error) {
      Utils.handleError(error, "Sort failed");
    } finally {
      await Utils.wait(300);
      LoadingState.stop(button);
      button.classList.remove("sorting");

      // Cleanup transitions
      const tasks = taskList.querySelectorAll(".task-item");
      tasks.forEach((task) => {
        task.style.transition = "";
        task.style.transform = "";
      });
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
        UserMenuController.toggleLogoutMenu(false);
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
// MODULE: Notification Manager
//=============================================================================
const NotificationManager = {
  createNotification({ type = "info", title, message, duration = 8000, icon }) {
    const container = document.getElementById("notification-container");
    if (!container) return null;

    // Remove existing notifications of the same type
    const existing = container.querySelector(`.notification.${type}`);
    if (existing) existing.remove();

    const icons = {
      success:
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>',
      error:
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>',
      warning:
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>',
      loading: `
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
      `,
    };

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;

    notification.innerHTML = `
      <div class="notification-icon ${type === "loading" ? "animate-spin" : ""}">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          ${icon || icons[type] || icons.info}
        </svg>
      </div>
      <div class="flex-1">
        ${title ? `<div class="font-medium text-sm">${title}</div>` : ""}
        <div class="text-xs ${type === "warning" ? "text-amber-700/80" : "text-gray-500"}">${message}</div>
      </div>
      ${
        type !== "loading"
          ? `
        <button class="notification-dismiss" aria-label="Dismiss">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      `
          : ""
      }
    `;

    const dismiss = () => {
      notification.classList.add("removing");
      notification.addEventListener("animationend", () => {
        notification.remove();
        if (container.children.length === 0) {
          container.classList.add("hidden");
        }
      });
    };

    if (type !== "loading") {
      // Add dismiss button handler
      notification
        .querySelector(".notification-dismiss")
        ?.addEventListener("click", dismiss);

      // Auto dismiss after duration
      if (duration > 0) {
        let dismissTimeout;
        const startDismissTimer = () =>
          (dismissTimeout = setTimeout(dismiss, duration));
        const pauseDismissTimer = () => clearTimeout(dismissTimeout);

        notification.addEventListener("mouseenter", pauseDismissTimer);
        notification.addEventListener("mouseleave", startDismissTimer);
        startDismissTimer();
      }
    }

    container.classList.remove("hidden");
    container.prepend(notification);

    return notification;
  },

  show(message, type = "info") {
    return this.createNotification({ type, message });
  },

  showLoading(title, message) {
    return this.createNotification({
      type: "loading",
      title,
      message,
      duration: 0,
    });
  },

  showWarning(title, message, duration = 5000) {
    return this.createNotification({
      type: "warning",
      title,
      message,
      duration,
    });
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
  ViewManager.init();

  // Restore list view to apply consistent styles and animations
  ViewManager.restoreListView();

  // Show guidance to user about syncing
  NotificationManager.showWarning(
    "Welcome back!",
    "Click the sync button in the menu to load your tasks.",
    8000,
  );

  // Load initial tasks with animation
  const initialTasks = window.initialTasks || []; // This will be passed from Flask
  if (initialTasks.length > 0) {
    TaskManager.updateTaskList(initialTasks, DOM.get("taskList"));
  }

  // Animate initial tasks
  const taskElements = document.querySelectorAll("#task-list .task-item");
  if (taskElements.length > 0) {
    taskElements.forEach((task, index) => {
      setTimeout(() => {
        task.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        task.style.opacity = "1";
        task.style.transform = "translateY(0)";

        task.addEventListener(
          "transitionend",
          () => {
            task.style.transition = "";
            task.style.transform = "";
          },
          { once: true },
        );
      }, index * 50);
    });
  }
}
