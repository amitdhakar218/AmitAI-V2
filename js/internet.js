/* =========================================================
   AMIT AI — internet.js
   Optional real-time web search enrichment.
   Uses DuckDuckGo's free Instant Answer API (no key needed).
   If you later give your own AI model real internet access,
   you can simply stop calling this module — chat.js only
   uses it as an optional pre-step before calling Api.
   Depends on: utils.js
   ========================================================= */

window.Internet = (function () {

  const DDG_ENDPOINT = "https://api.duckduckgo.com/";
  let enabled = Utils.storage.get("amitai_internet_enabled", true);

  /* ---------- Toggle internet search on/off (settings) ---------- */
  function setEnabled(value) {
    enabled = !!value;
    Utils.storage.set("amitai_internet_enabled", enabled);
  }
  function isEnabled() {
    return enabled;
  }

  /* ---------------------------------------------------------
     shouldSearch — simple heuristic to decide if a user's
     message likely needs fresh/real-world info.
     This is intentionally simple; your own AI model can later
     decide this more intelligently server-side if you prefer.
  --------------------------------------------------------- */
  function shouldSearch(userText) {
    if (!enabled || !userText) return false;
    const triggers = [
      "aaj", "abhi", "latest", "current", "news", "kal ka",
      "score", "price", "rate", "weather", "mausam",
      "kaun hai", "kya hua", "update", "2025", "2026", "2027"
    ];
    const lower = userText.toLowerCase();
    return triggers.some(t => lower.includes(t));
  }

  /* ---------------------------------------------------------
     search — queries DuckDuckGo Instant Answer API and
     returns a short plain-text summary, or "" if nothing
     useful was found / request failed.
  --------------------------------------------------------- */
  async function search(query) {
    if (!query || !query.trim()) return "";

    try {
      const url = DDG_ENDPOINT + "?q=" + encodeURIComponent(query) +
                  "&format=json&no_redirect=1&no_html=1&skip_disambig=1";

      // DuckDuckGo API doesn't send CORS headers reliably from browsers,
      // so we try/catch and fail silently — this is a best-effort enrichment.
      const res = await fetch(url);
      if (!res.ok) return "";

      const data = await res.json();
      const pieces = [];

      if (data.AbstractText) pieces.push(data.AbstractText);
      if (data.Answer) pieces.push(data.Answer);
      if (data.Definition) pieces.push(data.Definition);

      if (pieces.length === 0 && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 3)) {
          if (topic.Text) pieces.push(topic.Text);
        }
      }

      return pieces.join(" ").slice(0, 600); // keep it short
    } catch (err) {
      console.warn("[Internet.search] failed (this is non-fatal):", err);
      return "";
    }
  }

  /* ---------------------------------------------------------
     buildSearchContext — wraps search() output into a labeled
     text block ready to prepend to the outgoing message,
     similar to memory.js's buildMemoryContext().
  --------------------------------------------------------- */
  async function buildSearchContext(userText) {
    if (!shouldSearch(userText)) return "";
    const result = await search(userText);
    if (!result) return "";
    return "Internet se mili taaza jaankari:\n" + result;
  }

  return {
    setEnabled,
    isEnabled,
    shouldSearch,
    search,
    buildSearchContext
  };

})();