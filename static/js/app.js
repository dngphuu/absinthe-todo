// SHOW LOGOUT MENU

document.getElementById("user-avatar").addEventListener("click", function () {
  const LOGOUT_MENU = document.getElementById("logout-menu");

  if (LOGOUT_MENU.classList.contains("hidden")) {
    LOGOUT_MENU.classList.remove("hidden");
    LOGOUT_MENU.classList.add("show");
  } else {
    LOGOUT_MENU.classList.remove("show");
    LOGOUT_MENU.classList.add("hidden");
  }
});
