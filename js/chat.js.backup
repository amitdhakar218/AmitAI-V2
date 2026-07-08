/* =========================================================
   AMIT AI — chat.js
   Core chat engine: renders messages, wires the input bar,
   and orchestrates Plugins -> Memory -> Internet -> Api ->
   Markdown -> Voice for every send/receive cycle.
   Depends on: utils.js, api.js, memory.js, internet.js,
               plugins.js, markdown.js, voice.js, upload.js,
               history.js, sidebar.js
   ========================================================= */

window.Chat = (function () {

  let chatAreaEl, welcomeEl, textInput, sendBtn, chatLogoCorner;
  let currentChatId = null;
  let activeStreamController = null;

  /* ---------------------------------------------------------
     showWelcome / showChatArea — toggles between the empty
     hero state and the message list.
  --------------------------------------------------------- */
  function showWelcome() {
    welcomeEl.style.display = "flex";
    chatAreaEl.style.display = "none";
  }

  function showChatArea() {
    welcomeEl.style.display = "none";
    chatAreaEl.style.display = "flex";
  }

  /* ---------------------------------------------------------
     startNewChat — creates a fresh chat via History and
     resets the visible message area.
  --------------------------------------------------------- */
  function startNewChat() {
    const chat = History.createChat();
    currentChatId = chat.id;
    chatAreaEl.innerHTML = "";
    showWelcome();
    Sidebar.setActiveChat(currentChatId);
  }

  /* ---------------------------------------------------------
     openChat — loads an existing chat's messages from
     History and re-renders them.
  --------------------------------------------------------- */
  function openChat(chatId) {
    const chat = History.getChat(chatId);
    if (!chat) return;

    currentChatId = chatId;
    chatAreaEl.innerHTML = "";

    if (chat.messages.length === 0) {
      showWelcome();
    } else {
      showChatArea();
      chat.messages.forEach(msg => renderMessage(msg));
      scrollToBottom();
    }
    Sidebar.setActiveChat(chatId);
  }

  function scrollToBottom() {
    chatAreaEl.scrollTop = chatAreaEl.scrollHeight;
  }

  /* ---------------------------------------------------------
     renderMessage — draws one message row. Uses Markdown.render
     for AI messages, plain escaped text for user messages.
  --------------------------------------------------------- */
  function renderMessage(msg) {
    const row = document.createElement("div");
    row.className = "msg-row " + msg.role;

    const avatar = document.createElement("div");
    avatar.className = "avatar " + (msg.role === "user" ? "user" : "ai");
    avatar.textContent = msg.role === "user" ? "🙂" : "A";

    const content = document.createElement("div");
    content.className = "msg-content";

    const roleLabel = document.createElement("div");
    roleLabel.className = "msg-role";
    roleLabel.textContent = msg.role === "user" ? "Aap" : "Amit AI";

    const textDiv = document.createElement("div");
    textDiv.className = "msg-text";
    if (msg.role === "ai") {
      textDiv.innerHTML = Markdown.render(msg.text || "");
    } else {
      textDiv.textContent = msg.text || "";
    }

    content.appendChild(roleLabel);
    content.appendChild(textDiv);

    // Attachments
    (msg.attachments || []).forEach(a => {
      if (a.isImage) {
        const wrap = document.createElement("div");
        wrap.className = "msg-attachment";
        const img = document.createElement("img");
        img.src = a.data;
        wrap.appendChild(img);
        content.appendChild(wrap);
      } else {
        const chip = document.createElement("div");
        chip.className = "msg-file-chip";
        chip.textContent = "📎 " + a.name;
        content.appendChild(chip);
      }
    });

    // Actions (copy/speak) — only for AI messages
    if (msg.role === "ai") {
      const actions = document.createElement("div");
      actions.className = "msg-actions";

      const copyBtn = document.createElement("button");
      copyBtn.innerHTML = "📋 Copy";
      copyBtn.addEventListener("click", () => {
        Utils.copyToClipboard(msg.text).then(() => {
          const old = copyBtn.innerHTML;
          copyBtn.innerHTML = "✅ Copied";
          setTimeout(() => copyBtn.innerHTML = old, 1200);
        });
      });

      const speakBtn = document.createElement("button");
      speakBtn.innerHTML = "🔊 Sunein";
      speakBtn.addEventListener("click", () => Voice.speak(msg.text));

      actions.appendChild(copyBtn);
      actions.appendChild(speakBtn);
      content.appendChild(actions);
    }

    row.appendChild(avatar);
    row.appendChild(content);
    chatAreaEl.appendChild(row);

    wireCodeCopyButtons(textDiv);
    return { row, textDiv };
  }

  /* ---------------------------------------------------------
     wireCodeCopyButtons — activates the "📋 Copy" button
     inside every rendered code-block (markdown.js only
     builds the markup; behavior is attached here).
  --------------------------------------------------------- */
  function wireCodeCopyButtons(container) {
    container.querySelectorAll(".copy-code-btn").forEach(btn => {
      if (btn.dataset.wired) return;
      btn.dataset.wired = "1";
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-code-target");
        const codeEl = document.getElementById(targetId);
        if (!codeEl) return;
        Utils.copyToClipboard(codeEl.innerText).then(() => {
          const old = btn.innerHTML;
          btn.innerHTML = "✅ Copied";
          setTimeout(() => btn.innerHTML = old, 1200);
        });
      });
    });
  }

  /* ---------------------------------------------------------
     showTypingIndicator / removeTypingIndicator
  --------------------------------------------------------- */
  function showTypingIndicator() {
    const row = document.createElement("div");
    row.className = "msg-row ai";
    row.id = "typing-row";
    row.innerHTML = `
      <div class="avatar ai">A</div>
      <div class="msg-content">
        <div class="msg-role">Amit AI</div>
        <div class="typing"><span></span><span></span><span></span></div>
      </div>`;
    chatAreaEl.appendChild(row);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const row = document.getElementById("typing-row");
    if (row) row.remove();
  }

  /* ---------------------------------------------------------
     sendMessage — the full send/receive orchestration.
  --------------------------------------------------------- */
  async function sendMessage() {
    const text = textInput.value.trim();
    const attachments = Upload.getPendingAttachments();
    if (!text && attachments.length === 0) return;

    if (!currentChatId) startNewChat();
    showChatArea();

    // Build the text actually sent to the model: if a PDF was
    // uploaded, append its extracted text as context.
    let effectiveText = text;
    attachments.forEach(a => {
      if (a.isPdf && a.extractedText) {
        effectiveText += `\n\n[PDF: ${a.name}]\n${a.extractedText}`;
      }
    });

    const userMsg = { role: "user", text, attachments, ts: Date.now() };
    History.addMessage(currentChatId, userMsg);
    renderMessage(userMsg);

    textInput.value = "";
    Utils.autoGrowTextarea(textInput);
    Upload.clearPendingAttachments();
    sendBtn.disabled = true;
    scrollToBottom();

    Memory.autoCapture(text);

    // 1) Check local plugins first — instant answer, no backend call
    const plugin = Plugins.findMatch(text);
    if (plugin) {
      showTypingIndicator();
      const reply = await Plugins.runPlugin(plugin, text);
      removeTypingIndicator();
      finalizeAiReply(reply);
      return;
    }

    // 2) Build memory + internet context, then stream from backend
    showTypingIndicator();
    const memoryContext = Memory.buildMemoryContext();
    const searchContext = await Internet.buildSearchContext(text);

    let promptWithContext = effectiveText;
    if (memoryContext) promptWithContext = memoryContext + "\n\n" + promptWithContext;
    if (searchContext) promptWithContext = searchContext + "\n\n" + promptWithContext;

    let streamedRow = null;
    let firstChunk = true;

    activeStreamController = await Api.streamMessage(
      promptWithContext,
      attachments,
      (delta, fullText) => {
        if (firstChunk) {
          removeTypingIndicator();
          streamedRow = renderMessage({ role: "ai", text: "" });
          firstChunk = false;
        }
        streamedRow.textDiv.innerHTML = Markdown.render(fullText) +
          '<span class="stream-cursor"></span>';
        wireCodeCopyButtons(streamedRow.textDiv);
        scrollToBottom();
      },
      (fullText) => {
        removeTypingIndicator();
        if (!streamedRow) {
          finalizeAiReply(fullText);
        } else {
          streamedRow.textDiv.innerHTML = Markdown.render(fullText);
          wireCodeCopyButtons(streamedRow.textDiv);
          addAiMessageActions(streamedRow, fullText);
          History.addMessage(currentChatId, { role: "ai", text: fullText, ts: Date.now() });
        }
      },
      (errorMsg) => {
        removeTypingIndicator();
        finalizeAiReply(errorMsg);
      }
    );
  }

  /* ---------- finalizeAiReply — used by plugin replies & error/non-stream paths ---------- */
  function finalizeAiReply(text) {
    const aiMsg = { role: "ai", text, ts: Date.now() };
    History.addMessage(currentChatId, aiMsg);
    renderMessage(aiMsg);
    scrollToBottom();
  }

  /* ---------- addAiMessageActions — attaches copy/speak buttons after streaming ends ---------- */
  function addAiMessageActions(streamedRow, text) {
    const actions = document.createElement("div");
    actions.className = "msg-actions";

    const copyBtn = document.createElement("button");
    copyBtn.innerHTML = "📋 Copy";
    copyBtn.addEventListener("click", () => {
      Utils.copyToClipboard(text).then(() => {
        const old = copyBtn.innerHTML;
        copyBtn.innerHTML = "✅ Copied";
        setTimeout(() => copyBtn.innerHTML = old, 1200);
      });
    });

    const speakBtn = document.createElement("button");
    speakBtn.innerHTML = "🔊 Sunein";
    speakBtn.addEventListener("click", () => Voice.speak(text));

    actions.appendChild(copyBtn);
    actions.appendChild(speakBtn);
    streamedRow.row.querySelector(".msg-content").appendChild(actions);
  }

  /* ---------------------------------------------------------
     init — wires input bar + cross-module bus events.
  --------------------------------------------------------- */
  function init() {
    chatAreaEl = document.getElementById("chat-area");
    welcomeEl = document.getElementById("welcome");
    textInput = document.getElementById("text-input");
    sendBtn = document.getElementById("send-btn");
    chatLogoCorner = document.getElementById("chat-logo-corner");

    textInput.addEventListener("input", () => {
      Utils.autoGrowTextarea(textInput);
      sendBtn.disabled = !(textInput.value.trim() || Upload.getPendingAttachments().length);
    });

    textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    sendBtn.addEventListener("click", sendMessage);

    Utils.bus.on("upload:changed", (attachments) => {
      sendBtn.disabled = !(textInput.value.trim() || attachments.length);
    });

    Utils.bus.on("sidebar:new-chat-requested", startNewChat);
    Utils.bus.on("sidebar:chat-selected", openChat);
    Utils.bus.on("sidebar:active-chat-deleted", () => {
      currentChatId = null;
      chatAreaEl.innerHTML = "";
      showWelcome();
    });

    // Voice transcript flows into the text input, live
    Utils.bus.on("voice:transcript", ({ text }) => {
      textInput.value = text;
      Utils.autoGrowTextarea(textInput);
      sendBtn.disabled = !(text.trim() || Upload.getPendingAttachments().length);
    });
  }

  return {
    init,
    openChat,
    startNewChat,
    sendMessage
  };

})();