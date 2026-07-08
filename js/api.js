/* =========================================================
   AMIT AI — api.js
   The ONLY file that talks to the backend.
   Backend contract (already built by you):
       POST http://127.0.0.1:5000/chat
   No other module should call fetch() to the AI backend directly.
   ========================================================= */

window.Api = (function () {

  const BASE_URL = "http://127.0.0.1:5000";
  const CHAT_ENDPOINT = BASE_URL + "/chat";

  /* ---------------------------------------------------------
     sendMessage — non-streaming fallback.
     Sends { message, attachments } and expects back
     { reply: "..." } (adjust key name here if your backend
     uses a different response field).
  --------------------------------------------------------- */
  async function sendMessage(userText, attachments) {
    try {
      const res = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          attachments: (attachments || []).map(a => ({
            name: a.name,
            type: a.type,
            data: a.data
          }))
        })
      });

      if (!res.ok) {
        throw new Error("Server ne error diya: HTTP " + res.status);
      }

      const data = await res.json();
      return data.reply || data.response || data.message || "(Khali jawaab mila)";
    } catch (err) {
      console.error("[Api.sendMessage] failed:", err);
      return "⚠️ Amit AI backend se connect nahi ho paya. Check karein ki server (http://127.0.0.1:5000) chal raha hai.";
    }
  }

  /* ---------------------------------------------------------
     streamMessage — ChatGPT-style streaming.
     Calls onChunk(text) as each piece arrives, and
     onDone(fullText) once the stream ends.

     Expects the backend to stream plain text OR
     newline-delimited JSON chunks like: {"delta":"..."}
     Adjust the `extractDelta()` parser below to match
     whatever format your /chat endpoint streams.

     If the backend doesn't stream (returns a normal JSON
     response in one go), this function automatically falls
     back to sendMessage() and delivers the whole reply as
     a single "chunk".
  --------------------------------------------------------- */
  async function streamMessage(userText, attachments, onChunk, onDone, onError) {
    let controller = new AbortController();

    try {
      const res = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          stream: true,
          attachments: (attachments || []).map(a => ({
            name: a.name,
            type: a.type,
            data: a.data
          }))
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        throw new Error("Server ne error diya: HTTP " + res.status);
      }

      // If the browser/backend doesn't support streaming body reading,
      // fall back to a normal JSON response.
      if (!res.body || !res.body.getReader) {
        const data = await res.json();
        const full = data.reply || data.response || data.message || "(Khali jawaab mila)";
        onChunk(full);
        onDone(full);
        return controller;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on newlines in case backend sends NDJSON chunks
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep last partial line in buffer

        for (const line of lines) {
          const delta = extractDelta(line);
          if (delta) {
            fullText += delta;
            onChunk(delta, fullText);
          }
        }
      }

      // flush any remaining buffered text
      if (buffer) {
        const delta = extractDelta(buffer);
        if (delta) {
          fullText += delta;
          onChunk(delta, fullText);
        }
      }

      onDone(fullText);
      return controller;

    } catch (err) {
      if (err.name === "AbortError") {
        console.log("[Api.streamMessage] stream cancelled by user");
      } else {
        console.error("[Api.streamMessage] failed:", err);
        if (onError) {
          onError("⚠️ Amit AI backend se connect nahi ho paya. Check karein ki server (http://127.0.0.1:5000) chal raha hai.");
        }
      }
      return controller;
    }
  }

  /* ---------------------------------------------------------
     extractDelta — parses one streamed line into plain text.
     Handles three common formats:
       1. Plain text line                -> returned as-is
       2. JSON line: {"delta":"text"}    -> returns .delta
       3. SSE line: "data: {json}"       -> strips "data: " then parses
     Adjust this if your backend uses a different streaming format.
  --------------------------------------------------------- */
  function extractDelta(line) {
    if (!line || !line.trim()) return "";

    let raw = line.trim();
    if (raw.startsWith("data:")) {
      raw = raw.slice(5).trim();
    }
    if (raw === "[DONE]") return "";

    // Try JSON first
    try {
      const obj = JSON.parse(raw);
      return obj.delta || obj.text || obj.content || "";
    } catch (e) {
      // Not JSON — treat as plain text chunk
      return raw;
    }
  }

  /* ---------------------------------------------------------
     cancelStream — abort an in-flight stream (used if user
     clicks a "stop generating" button in future).
  --------------------------------------------------------- */
  function cancelStream(controller) {
    if (controller && controller.abort) controller.abort();
  }

  return {
    BASE_URL,
    CHAT_ENDPOINT,
    sendMessage,
    streamMessage,
    cancelStream
  };

})();