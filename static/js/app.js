// SHOW LOGOUT MENU

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

// TASK DISPLAY SECTION

// 1.1 LINE GLOWING EFFECT ON TASK INPUT
const taskInput = document.getElementById("task-input");
const addTaskContainer = document.getElementById("add-task-container");
const addTaskIcon = document.getElementById("add-task-icon");

taskInput.addEventListener("mouseover", function () {
  addTaskContainer.classList.add(
    "after:bg-black",
    "after:shadow-lg",
    "after:shadow-black",
  );
});

taskInput.addEventListener("mouseout", function () {
  addTaskContainer.classList.remove(
    "after:bg-black",
    "after:shadow-lg",
    "after:shadow-black",
  );
});

taskInput.addEventListener("focus", function () {
  addTaskContainer.classList.add(
    "after:bg-[#3d72fe]",
    "after:shadow-lg",
    "after:shadow-[#3d72fe]",
  );
});

taskInput.addEventListener("blur", function () {
  addTaskContainer.classList.remove(
    "after:bg-[#3d72fe]",
    "after:shadow-lg",
    "after:shadow-[#3d72fe]",
  );
});

// 1.2 ADD TASK BUTTON EFFECT

taskInput.addEventListener("input", function () {
  if (taskInput.value.trim() !== "") {
    addTaskIcon.style.fill = "#3d72fe";
  } else {
    addTaskIcon.style.fill = "#bdbdbd";
  }
});


