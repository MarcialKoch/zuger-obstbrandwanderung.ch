// Custom smooth scroll with controllable duration
function smoothScrollTo(targetY, duration = 1500) {
  const startY = window.scrollY;
  const diff = targetY - startY;
  const startTime = performance.now();

  // easeInOutCubic (smooth + natural)
  const ease = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = ease(t);

    window.scrollTo(0, startY + diff * eased);

    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

document.addEventListener(
  "click",
  (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const hash = link.getAttribute("href"); // e.g. "#section_erwartung"
    if (!hash || hash === "#") return;

    const target = document.querySelector(hash);
    if (!target) return;

    // Stop Webflow (and any other handler) from running
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const nav = document.querySelector(".navbar"); // fixed navbar
    const navH = nav ? nav.getBoundingClientRect().height : 0;

    const y = target.getBoundingClientRect().top + window.scrollY - navH;

    // ✅ CONTROL SPEED HERE:
    smoothScrollTo(y, 1600); // ms (try 1200 / 1600 / 2200)

    // Optional: update URL hash without jumping
    history.pushState(null, "", hash);

    // Optional: close Webflow mobile menu after click
    const menuButton = document.querySelector(".w-nav-button");
    if (menuButton && menuButton.classList.contains("w--open")) {
      menuButton.click();
    }
  },
  true // capture phase so we run before Webflow
);

// Optional: if page loads with a hash in the URL, scroll with offset too
window.addEventListener("load", () => {
  const hash = window.location.hash;
  if (!hash) return;

  const target = document.querySelector(hash);
  if (!target) return;

  const nav = document.querySelector(".navbar");
  const navH = nav ? nav.getBoundingClientRect().height : 0;

  const y = target.getBoundingClientRect().top + window.scrollY - navH;

  // ✅ same duration on initial load:
  smoothScrollTo(y, 1600);
});


  const toggleButton = document.getElementById("menuToggle");

  toggleButton.addEventListener("click", () => {
    toggleButton.classList.toggle("is-active");
  });

  window.addEventListener("load", () => {
  window.scrollTo(0, 0);
});
