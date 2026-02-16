(function () {
  // 1) If someone opens the page with a hash, remove it (but still scroll there once)
  function scrollToHashIfPresentThenClean() {
    const hash = window.location.hash;
    if (!hash || hash === "#") return;

    const target = document.querySelector(hash);
    if (target) {
      // jump without relying on browser default
      target.scrollIntoView({ behavior: "auto", block: "start" });
    }

    // clean URL (remove hash)
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  // 2) Intercept anchor clicks BEFORE other handlers (capture phase)
  document.addEventListener(
    "click",
    function (e) {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;

      const href = a.getAttribute("href");
      if (!href || href === "#" || href.length < 2) return;

      const target = document.querySelector(href);
      if (!target) return;

      // Stop everything else from also processing this click
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();

      target.scrollIntoView({ behavior: "smooth", block: "start" });

      // Make sure URL stays clean
      history.replaceState(null, "", window.location.pathname + window.location.search);
    },
    true // ✅ capture phase
  );

  // 3) If anything still changes the hash, immediately remove it
  window.addEventListener("hashchange", function () {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  });

  // Run once on initial load
  window.addEventListener("DOMContentLoaded", scrollToHashIfPresentThenClean);
})();
