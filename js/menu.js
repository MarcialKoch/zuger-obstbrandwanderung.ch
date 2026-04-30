document.documentElement.classList.add("w-mod-js");

if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
  document.documentElement.classList.add("w-mod-touch");
}

document.addEventListener("DOMContentLoaded", () => {
  const button = document.querySelector("#menuToggle");
  const menu = document.querySelector(".drop_menu");

  if (!button || !menu) return;

  function openMenu() {
    button.classList.add("is-active", "w--open");
    menu.classList.add("is-open");
    document.body.classList.add("menu-open");
  }

  function closeMenu() {
    button.classList.remove("is-active", "w--open");
    menu.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  }

  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (menu.classList.contains("is-open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Important: event delegation
  menu.addEventListener("click", (e) => {
    const link = e.target.closest("a");

    if (link) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  const navbar = document.querySelector(".navbar");

function updateNavbarState() {
  if (!navbar) return;

  if (window.scrollY <= 10) {
    navbar.classList.remove("scrolled");
  } else {
    navbar.classList.add("scrolled");
  }
}

window.addEventListener("scroll", updateNavbarState, { passive: true });
window.addEventListener("load", updateNavbarState);

updateNavbarState();
});