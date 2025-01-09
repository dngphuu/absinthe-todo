// SHOW LOGOUT MENU

document.getElementById("user-info").addEventListener("click", function () {
  const LOGOUT_MENU = document.getElementById("logout-menu");

  if (LOGOUT_MENU.classList.contains("hidden")) {
    LOGOUT_MENU.classList.remove("hidden");
    LOGOUT_MENU.classList.add("block");
  } else {
    LOGOUT_MENU.classList.remove("block");
    LOGOUT_MENU.classList.add("hidden");
  }
});
