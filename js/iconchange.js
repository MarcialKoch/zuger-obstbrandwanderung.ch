(() => {
  window.addEventListener("load", () => {
    const goup = document.querySelector(".goup");
    if (!goup) return;

    const img1 = goup.querySelector(".goup-img.is-front");
    const img2 = goup.querySelector(".goup-img.is-back");
    if (!img1 || !img2) return;

    const ids = [
      "section_erwartung",
      "section_anreise",
      "section_stationen",
      "section_about",
    ];

    const triggers = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .map((el) => ({ el, id: el.id, img: el.getAttribute("data-goup-img") }))
      .filter((t) => !!t.img);

    if (!triggers.length) return;

    const erwartung = document.getElementById("section_erwartung");
    if (!erwartung) return;

    // Visibility helpers
    function setVisible(visible) {
      goup.classList.toggle("is-hidden", !visible);
      goup.classList.toggle("is-visible", visible);
    }

    // Use the CENTER of the icon (not the link padding)
    function getGoupCenterY() {
      const ref = goup.querySelector(".goup-icon") || goup;
      const r = ref.getBoundingClientRect();
      return r.top + r.height / 2;
    }

    // ---- Morph engine: NO pulse + cannot get stuck ----
    let frontEl = img1;
    let backEl = img2;
    let currentSrc = frontEl.getAttribute("src") || "";
    let animating = false;
    let activeSectionId = null;

    function finalizeSwap(newSrc) {
      // swap refs, so we never need a "flip back"
      const tmp = frontEl;
      frontEl = backEl;
      backEl = tmp;

      currentSrc = newSrc;
      animating = false;
    }

    function morphTo(newSrc) {
      if (!newSrc || newSrc === currentSrc || animating) return;
      animating = true;

      // prepare hidden image
      backEl.src = newSrc;

      // start fade
      backEl.classList.add("is-front");
      frontEl.classList.remove("is-front");

      // transitionend can fail → add a hard fallback
      let done = false;

      const onEnd = (e) => {
        // accept opacity OR filter end (depends on browser)
        if (e.propertyName !== "opacity" && e.propertyName !== "filter") return;
        if (done) return;
        done = true;
        backEl.removeEventListener("transitionend", onEnd);
        finalizeSwap(newSrc);
      };

      backEl.addEventListener("transitionend", onEnd);

      // fallback: force-complete after 650ms no matter what
      setTimeout(() => {
        if (done) return;
        done = true;
        backEl.removeEventListener("transitionend", onEnd);
        finalizeSwap(newSrc);
      }, 650);
    }

    // ---- Section selection (works up/down, no ordering assumptions) ----
    function update() {
      const y = getGoupCenterY();

      // show once erwartung top is above goup center
      const show = erwartung.getBoundingClientRect().top <= y;
      setVisible(show);

      if (!show) {
        activeSectionId = null;
        return;
      }

      // choose the trigger whose top is closest to y but still <= y
      let best = null;
      let bestTop = -Infinity;

      for (const t of triggers) {
        const top = t.el.getBoundingClientRect().top;
        if (top <= y && top > bestTop) {
          bestTop = top;
          best = t;
        }
      }

      if (!best) return;
      if (best.id === activeSectionId) return;

      activeSectionId = best.id;
      morphTo(best.img);
    }

    // RAF throttle for smoother behavior
    let ticking = false;
    function onScrollOrResize() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    }

    // init
    setVisible(false);
    update();

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
  });
})();
