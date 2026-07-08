/* =========================================================
   AMIT AI — settings-store.js  (NEW FILE)
   Central settings persistence + side-effect application.
   Everything lives under one localStorage key
   ("amitai_settings") except two values that proxy to keys
   other modules already own (theme -> amitai_theme via
   theme.js, internetEnabled -> amitai_internet_enabled via
   internet.js) so there is never a duplicate source of truth.
   Depends on: utils.js
   ========================================================= */

window.SettingsStore = (function () {

  const STORAGE_KEY = "amitai_settings";

  const DEFAULTS = {
    // Account
    name: "",
    email: "",
    aiNickname: "",
    profilePhoto: "",

    // Appearance
    theme: "system",
    accentColor: "#10a37f",
    fontSize: "medium",
    bubbleSize: "normal",
    appAnimation: true,

    // AI Settings
    aiName: "Amit AI",
    responseLanguage: "hinglish",
    responseLength: "medium",
    creativity: 50,
    markdown: true,
    codeHighlight: true,
    streaming: true,
    thinkingAnimation: true,

    // Memory
    memoryEnabled: true,
    autoRemember: true,

    // Internet
    internetEnabled: true,
    searchEngine: "duckduckgo",
    safeSearch: true,
    offlineMode: false,

    // Voice
    voiceInput: true,
    voiceOutput: true,
    voiceSpeed: 1,
    voicePitch: 1,
    autoSpeak: false,

    // Files
    pdfEnabled: true,
    ocrEnabled: true,
    imageAnalysis: true,
    cameraUpload: true,
    galleryUpload: true,
    maxFileSizeMb: 20,

    // Privacy
    saveHistory: true,
    autoDelete: "never",

    // Performance
    batterySaver: false,
    highPerformance: false,
    gpuEffects: true,
    smoothAnimation: true,

    // Extensions
    pluginsEnabled: true,

    // Developer
    debugMode: false
  };

  let cache = Object.assign({}, DEFAULTS, Utils.storage.get(STORAGE_KEY, {}));

  function persist() {
    Utils.storage.set(STORAGE_KEY, cache);
  }

  function get(key) {
    if (key === "theme") return Utils.storage.get("amitai_theme", null) || "system";
    if (key === "internetEnabled") return Utils.storage.get("amitai_internet_enabled", true);
    return cache.hasOwnProperty(key) ? cache[key] : DEFAULTS[key];
  }

  function set(key, value) {
    if (key === "theme") {
      if (value === "system") {
        Utils.storage.remove("amitai_theme");
        if (window.Theme) window.Theme.set(detectSystemPreference());
      } else if (window.Theme) {
        window.Theme.set(value);
      }
      Utils.bus.emit("settings:changed", { key, value });
      return;
    }
    if (key === "internetEnabled") {
      if (window.Internet) window.Internet.setEnabled(value);
      else Utils.storage.set("amitai_internet_enabled", value);
      Utils.bus.emit("settings:changed", { key, value });
      return;
    }

    cache[key] = value;
    persist();
    Utils.bus.emit("settings:changed", { key, value });
    applySideEffect(key, value);
  }

  function getAll() {
    return Object.assign({}, DEFAULTS, cache, {
      theme: get("theme"),
      internetEnabled: get("internetEnabled")
    });
  }

  function resetAll() {
    cache = Object.assign({}, DEFAULTS);
    persist();
    Utils.storage.remove("amitai_theme");
    Utils.bus.emit("settings:reset");
    applyVisualSettings();
  }

  function detectSystemPreference() {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
  }

  function applySideEffect(key) {
    switch (key) {
      case "accentColor":
        document.documentElement.style.setProperty("--accent", get("accentColor"));
        document.documentElement.style.setProperty("--accent-dark", shadeColor(get("accentColor"), -12));
        break;
      case "fontSize": {
        const scale = { small: "13.5px", medium: "15px", large: "16.5px", xlarge: "18px" }[get("fontSize")] || "15px";
        document.documentElement.style.setProperty("--settings-font-size", scale);
        break;
      }
      case "bubbleSize": {
        const pad = { compact: "6px 10px", normal: "10px 14px", large: "14px 18px" }[get("bubbleSize")] || "10px 14px";
        document.documentElement.style.setProperty("--settings-bubble-padding", pad);
        break;
      }
      case "appAnimation":
      case "smoothAnimation":
      case "batterySaver":
        applyAnimationState();
        break;
      case "gpuEffects":
        document.body.classList.toggle("no-glow", !get("gpuEffects"));
        break;
      default:
        break;
    }
  }

  function applyAnimationState() {
    const shouldAnimate = get("appAnimation") && get("smoothAnimation") && !get("batterySaver");
    document.body.classList.toggle("no-animations", !shouldAnimate);
  }

  function applyVisualSettings() {
    document.documentElement.style.setProperty("--accent", get("accentColor"));
    document.documentElement.style.setProperty("--accent-dark", shadeColor(get("accentColor"), -12));
    const scale = { small: "13.5px", medium: "15px", large: "16.5px", xlarge: "18px" }[get("fontSize")] || "15px";
    document.documentElement.style.setProperty("--settings-font-size", scale);
    const pad = { compact: "6px 10px", normal: "10px 14px", large: "14px 18px" }[get("bubbleSize")] || "10px 14px";
    document.documentElement.style.setProperty("--settings-bubble-padding", pad);
    document.body.classList.toggle("no-glow", !get("gpuEffects"));
    applyAnimationState();
  }

  function shadeColor(hex, percent) {
    try {
      let r = parseInt(hex.slice(1, 3), 16);
      let g = parseInt(hex.slice(3, 5), 16);
      let b = parseInt(hex.slice(5, 7), 16);
      r = Math.max(0, Math.min(255, Math.round(r + (r * percent) / 100)));
      g = Math.max(0, Math.min(255, Math.round(g + (g * percent) / 100)));
      b = Math.max(0, Math.min(255, Math.round(b + (b * percent) / 100)));
      return "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      return hex;
    }
  }

  function downloadJSON(filename, dataObj) {
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function readJSONFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try { resolve(JSON.parse(e.target.result)); }
        catch (err) { reject(new Error("Yeh valid JSON file nahi hai.")); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  const LOG_LIMIT = 200;
  window.__amitaiLogs = window.__amitaiLogs || [];

  function wrapConsole(method) {
    const original = console[method].bind(console);
    console[method] = function (...args) {
      try {
        window.__amitaiLogs.push({
          level: method,
          time: new Date().toLocaleTimeString("hi-IN"),
          text: args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")
        });
        if (window.__amitaiLogs.length > LOG_LIMIT) window.__amitaiLogs.shift();
      } catch (e) { /* never let logging break logging */ }
      original(...args);
    };
  }
  ["log", "warn", "error"].forEach(wrapConsole);

  function getLogs() {
    return window.__amitaiLogs.slice().reverse();
  }

  function getStorageUsageKB() {
    let total = 0;
    try {
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) total += (localStorage[key].length + key.length);
      }
    } catch (e) { /* ignore */ }
    return (total / 1024).toFixed(1);
  }

  return {
    DEFAULTS, get, set, getAll, resetAll,
    applyVisualSettings, downloadJSON, readJSONFile,
    getLogs, getStorageUsageKB
  };

})();

document.addEventListener("DOMContentLoaded", function () {
  window.SettingsStore.applyVisualSettings();
});