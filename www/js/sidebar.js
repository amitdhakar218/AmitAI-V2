/* =========================================================
   AMIT AI — sidebar.js
   Renders the sidebar (history list, search, new chat,
   toggle) from History's data. Owns DOM only — no storage
   logic lives here (see history.js).
   Depends on: utils.js, history.js
   ========================================================= */

window.Sidebar = (function () {

  let sidebarEl, overlayEl, historyBox, searchInput, menuBtn, newChatBtn, newChatIconBtn;
  let activeChatId = null;

  /* ---------------------------------------------------------
     render — rebuilds the history list based on the current
     search query and which chat is active.
  --------------------------------------------------------- */
  function render() {
    if (!historyBox) return;
    const query = searchInput ? searchInput.value : "";
    const chats = History.searchChats(query);

    historyBox.innerHTML = "";

    if (chats.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "padding:14px 10px;font-size:13px;color:var(--text-soft);";
      empty.textContent = query ? "Koi chat match nahi hui." : "Abhi koi chat history nahi hai.";
      historyBox.appendChild(empty);
      return;
    }

    chats.forEach(chat => {
      const item = document.createElement("div");
      item.className = "history-item" + (chat.id === activeChatId ? " active" : "");

      const title = document.createElement("span");
      title.className = "title";
      title.textContent = chat.title;

      const del = document.createElement("span");
      del.className = "del";
      del.textContent = "🗑️";
      del.title = "Delete chat";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        handleDelete(chat.id);
      });

      item.appendChild(title);
      item.appendChild(del);

      item.addEventListener("click", () => {
        setActiveChat(chat.id);
        Utils.bus.emit("sidebar:chat-selected", chat.id);
        closeOnMobile();
      });

      historyBox.appendChild(item);
    });
  }

  /* ---------- Mark a chat as active (visually) without re-fetching data ---------- */
  function setActiveChat(chatId) {
    activeChatId = chatId;
    render();
  }

  function getActiveChatId() {
    return activeChatId;
  }

  /* ---------- Delete confirmation + cleanup ---------- */
  function handleDelete(chatId) {
    History.deleteChat(chatId);
    if (activeChatId === chatId) {
      activeChatId = null;
      Utils.bus.emit("sidebar:active-chat-deleted", chatId);
    }
  }

  /* ---------------------------------------------------------
     Sidebar open/close (mobile off-canvas + desktop docked
     behavior is handled purely via CSS classes/breakpoints;
     this just toggles the classes).
  --------------------------------------------------------- */
  function open() {
    sidebarEl.classList.add("open");
    if (window.innerWidth < 900) overlayEl.classList.add("show");
  }

  function close() {
    sidebarEl.classList.remove("open");
    overlayEl.classList.remove("show");
  }

  function toggle() {
    if (sidebarEl.classList.contains("open")) close();
    else open();
  }

  function closeOnMobile() {
    if (window.innerWidth < 900) close();
  }

  /* ---------------------------------------------------------
     init
  --------------------------------------------------------- */
  function init() {
    sidebarEl = document.getElementById("sidebar");
    overlayEl = document.getElementById("sidebar-overlay");
    historyBox = document.getElementById("chat-history");
    searchInput = document.getElementById("search-input");
    menuBtn = document.getElementById("menu-btn");
    newChatBtn = document.getElementById("new-chat-btn");
    newChatIconBtn = document.getElementById("new-chat-icon-btn");

    menuBtn.addEventListener("click", toggle);
    overlayEl.addEventListener("click", close);

    const debouncedRender = Utils.debounce(render, 150);
    searchInput.addEventListener("input", debouncedRender);

    newChatBtn.addEventListener("click", () => {
      Utils.bus.emit("sidebar:new-chat-requested");
      closeOnMobile();
    });

    newChatIconBtn.addEventListener("click", () => {
      Utils.bus.emit("sidebar:new-chat-requested");
    });

    Utils.bus.on("history:updated", render);

    // On desktop, sidebar starts open/docked; on mobile it starts closed.
    if (window.innerWidth >= 900) {
      sidebarEl.classList.add("open");
    }

    render();
  }

  return {
    init,
    render,
    setActiveChat,
    getActiveChatId,
    open,
    close,
    toggle
  };

})();