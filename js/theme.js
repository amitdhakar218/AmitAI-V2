/* =========================================================
   AMIT AI — theme.js
   Dark mode toggle + persistence. All actual dark-mode
   styling lives in darkmode.css under body.dark-mode —
   this file only manages the class + button state.
   Depends on: utils.js
   ========================================================= */

window.Theme = (function () {

  const STORAGE_KEY = "amitai_theme"; // "dark" | "light"
  let toggleBtn = null;

  function apply(mode) {
    if (mode === "dark") {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
    updateButtonIcon(mode);
  }

  function updateButtonIcon(mode) {
    if (!toggleBtn) return;
    toggleBtn.textContent = mode === "dark" ? "☀️" : "🌙";
    toggleBtn.title = mode === "dark" ? "Light mode par jaayein" : "Dark mode par jaayein";
  }

  function set(mode) {
    Utils.storage.set(STORAGE_KEY, mode);
    apply(mode);
    Utils.bus.emit("theme:changed", mode);
  }

  function get() {
    return document.body.classList.contains("dark-mode") ? "dark" : "light";
  }

  function toggle() {
    set(get() === "dark" ? "light" : "dark");
  }

  function detectSystemPreference() {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  function init() {
    toggleBtn = document.getElementById("theme-toggle-btn");

    const saved = Utils.storage.get(STORAGE_KEY, null);
    const initialMode = saved || detectSystemPreference();
    apply(initialMode);

    if (toggleBtn) {
      toggleBtn.addEventListener("click", toggle);
    }

    // React live if OS theme changes and user never manually chose one
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        const userChose = Utils.storage.get(STORAGE_KEY, null);
        if (!userChose) {
          apply(e.matches ? "dark" : "light");
        }
      });
    }
  }

  return {
    init,
    toggle,
    set,
    get
  };

})();