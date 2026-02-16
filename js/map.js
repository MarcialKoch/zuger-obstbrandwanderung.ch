document.addEventListener("DOMContentLoaded", () => {
  const maps = document.querySelectorAll(".div-maps");

  maps.forEach(wrapper => {
    const iframe = wrapper.querySelector(".map-iframe");
    const overlay = wrapper.querySelector(".map-overlay");
    if (!iframe || !overlay) return;

    // Mobile: enable interaction immediately
    if (window.innerWidth < 768) {
      iframe.style.pointerEvents = "auto";
      overlay.style.display = "none";
      return;
    }

    // Activate map on first click
    overlay.addEventListener("click", () => {
      iframe.style.pointerEvents = "auto";
      overlay.style.display = "none";
    });

    // Disable interaction when leaving map
    wrapper.addEventListener("mouseleave", () => {
      iframe.style.pointerEvents = "none";
      overlay.style.display = "block";
    });
  });
});
