/* =========================================================
   AMIT AI — plugins.js
   Lightweight plugin system. Each plugin registers a
   `match(text)` test and a `run(text)` handler. chat.js
   checks Plugins.findMatch() before calling the AI backend,
   so simple local tasks (calculator, date/time, etc.) don't
   need a round-trip to the model at all.
   Depends on: utils.js
   ========================================================= */

window.Plugins = (function () {

  const registry = [];

  /* ---------------------------------------------------------
     register — add a new plugin.
     plugin = {
       name: "calculator",
       description: "Solves simple math expressions",
       match: (text) => boolean,
       run: async (text) => string   // returns the reply text
     }
  --------------------------------------------------------- */
  function register(plugin) {
    if (!plugin || !plugin.name || typeof plugin.match !== "function" || typeof plugin.run !== "function") {
      console.warn("[Plugins.register] invalid plugin definition:", plugin);
      return;
    }
    registry.push(plugin);
  }

  /* ---------- Find the first plugin whose match() returns true ---------- */
  function findMatch(userText) {
    if (!userText) return null;
    for (const plugin of registry) {
      try {
        if (plugin.match(userText)) return plugin;
      } catch (e) {
        console.error(`[Plugins] error in match() for "${plugin.name}"`, e);
      }
    }
    return null;
  }

  /* ---------- Run a matched plugin safely ---------- */
  async function runPlugin(plugin, userText) {
    try {
      return await plugin.run(userText);
    } catch (e) {
      console.error(`[Plugins] error running "${plugin.name}"`, e);
      return "⚠️ Plugin '" + plugin.name + "' me error aa gaya.";
    }
  }

  function listAll() {
    return registry.map(p => ({ name: p.name, description: p.description || "" }));
  }

  /* ===========================================================
     BUILT-IN EXAMPLE PLUGINS
     (proves the system works — add your own the same way)
     =========================================================== */

  /* ---- Plugin 1: Calculator ---- */
  register({
    name: "calculator",
    description: "Simple math expressions solve karta hai (e.g. '12*8+5')",
    match(text) {
      const trimmed = text.trim();
      // matches things like "2+2", "calculate 12*8", "12 * (8+5) ="
      return /^(calculate|calc|solve)?\s*[\d\s+\-*/().]+$/i.test(trimmed) &&
             /[0-9]/.test(trimmed) &&
             /[+\-*/]/.test(trimmed);
    },
    async run(text) {
      const expr = text.replace(/^(calculate|calc|solve)/i, "").replace(/=/g, "").trim();
      try {
        // Safe-ish eval: only allow digits, operators, parentheses, spaces, dots
        if (!/^[\d\s+\-*/().]+$/.test(expr)) throw new Error("invalid expression");
        // eslint-disable-next-line no-eval
        const result = Function('"use strict"; return (' + expr + ")")();
        return `🧮 Result: **${expr} = ${result}**`;
      } catch (e) {
        return "⚠️ Yeh expression samajh nahi aaya, dobara check karke bhejein.";
      }
    }
  });

  /* ---- Plugin 2: Date & Time ---- */
  register({
    name: "datetime",
    description: "Aaj ki date/time batata hai",
    match(text) {
      const lower = text.toLowerCase().trim();
      return /^(aaj ki date|aaj kya date hai|current time|abhi kya time hai|what.?s the time|today.?s date)\??$/i.test(lower);
    },
    async run() {
      const now = new Date();
      return "📅 " + now.toLocaleString("hi-IN", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    }
  });

  return {
    register,
    findMatch,
    runPlugin,
    listAll
  };

})();