/* =========================================================
   AMIT AI — utils.js
   Generic, dependency-free helper functions.
   No other module is imported here. Every other file may
   use window.Utils.
   ========================================================= */

window.Utils = (function () {

  /* ---------- Unique ID generator ---------- */
  function uid(prefix) {
    prefix = prefix || "id";
    return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- Safe HTML escaping (prevents XSS when inserting user/AI text) ---------- */
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    const div = document.createElement("div");
    div.innerText = String(str);
    return div.innerHTML;
  }

  /* ---------- Debounce (used by history search input) ---------- */
  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /* ---------- Safe localStorage wrapper (JSON-aware) ---------- */
  const storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        console.warn("[Utils.storage.get] failed for key:", key, e);
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.warn("[Utils.storage.set] failed for key:", key, e);
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn("[Utils.storage.remove] failed for key:", key, e);
      }
    }
  };

  /* ---------- File -> base64 (used by upload.js / ocr.js / pdf.js) ---------- */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  /* ---------- File -> plain text (used by pdf.js / ocr.js if needed) ---------- */
  function fileToText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  /* ---------- Human-readable file size ---------- */
  function formatFileSize(bytes) {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + " " + units[i];
  }

  /* ---------- Textarea auto-grow ---------- */
  function autoGrowTextarea(el, maxHeight) {
    maxHeight = maxHeight || 140;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
  }

  /* ---------- Format timestamp -> readable date/time ---------- */
  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleString("hi-IN", {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit"
    });
  }

  /* ---------- Clipboard copy helper ---------- */
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // fallback for older webviews
    return new Promise((resolve, reject) => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  /* ---------- Tiny event emitter (pub/sub) so modules can talk
     without directly depending on each other's internals) ---------- */
  function createEmitter() {
    const listeners = {};
    return {
      on(event, cb) {
        (listeners[event] = listeners[event] || []).push(cb);
      },
      off(event, cb) {
        if (!listeners[event]) return;
        listeners[event] = listeners[event].filter(fn => fn !== cb);
      },
      emit(event, payload) {
        (listeners[event] || []).forEach(cb => {
          try { cb(payload); } catch (e) { console.error(`[Emitter] listener error on "${event}"`, e); }
        });
      }
    };
  }

  /* Global shared bus — modules can do Utils.bus.on(...) / Utils.bus.emit(...) */
  const bus = createEmitter();

  return {
    uid,
    escapeHtml,
    debounce,
    storage,
    fileToBase64,
    fileToText,
    formatFileSize,
    autoGrowTextarea,
    formatTime,
    copyToClipboard,
    createEmitter,
    bus
  };

})();