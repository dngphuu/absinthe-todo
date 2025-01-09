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
