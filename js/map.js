// map.js
document.addEventListener("DOMContentLoaded", () => {
  const isMobile = window.matchMedia("(max-width: 767px)").matches;

  document.querySelectorAll(".div-maps").forEach((wrapper) => {
    const iframe = wrapper.querySelector(".map-iframe");
    const overlay = wrapper.querySelector(".map-overlay");
    if (!iframe || !overlay) return;

    const disableMap = () => {
      iframe.style.pointerEvents = "none";
      overlay.style.display = "block";
    };

    const enableMap = () => {
      iframe.style.pointerEvents = "auto";
      overlay.style.display = "none";
    };

    // Always start disabled (desktop + mobile)
    disableMap();

    // Desktop: click activates, mouseleave disables
    if (!isMobile) {
      overlay.addEventListener("click", enableMap);
      wrapper.addEventListener("mouseleave", disableMap);
      return;
    }

    // Mobile: distinguish TAP vs SCROLL (swipe)
    let startX = 0, startY = 0, moved = false;

    overlay.addEventListener("touchstart", (e) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      moved = false;
      // IMPORTANT: do NOT preventDefault -> allows page scrolling
    }, { passive: true });

    overlay.addEventListener("touchmove", (e) => {
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - startX);
      const dy = Math.abs(t.clientY - startY);
      if (dx > 8 || dy > 8) moved = true; // treat as scroll gesture
    }, { passive: true });

    overlay.addEventListener("touchend", () => {
      // Only enable map if it was a real tap (no scroll movement)
      if (!moved) enableMap();
    }, { passive: true });

    // Optional: disable again when user taps anywhere outside the map
    document.addEventListener("touchstart", (e) => {
      if (!wrapper.contains(e.target)) disableMap();
    }, { passive: true });
  });
});
