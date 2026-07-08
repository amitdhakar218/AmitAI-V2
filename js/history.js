/* =========================================================
   AMIT AI — history.js
   Pure data layer for chats: create/read/update/delete/search.
   No DOM code here at all — sidebar.js renders what this
   module exposes. Emits "history:updated" on every change.
   Depends on: utils.js
   ========================================================= */

window.History = (function () {

  const STORAGE_KEY = "amitai_chats";

  let chats = Utils.storage.get(STORAGE_KEY, {});

  function persist() {
    Utils.storage.set(STORAGE_KEY, chats);
    Utils.bus.emit("history:updated", chats);
  }

  /* ---------- Create a new empty chat ---------- */
  function createChat() {
    const id = Utils.uid("chat");
    chats[id] = {
      id,
      title: "Nayi Chat",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    persist();
    return chats[id];
  }

  /* ---------- Get a single chat by id ---------- */
  function getChat(id) {
    return chats[id] || null;
  }

  /* ---------- Get all chats sorted by most recently updated ---------- */
  function getAllChats() {
    return Object.values(chats).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /* ---------- Delete a chat ---------- */
  function deleteChat(id) {
    if (!chats[id]) return false;
    delete chats[id];
    persist();
    return true;
  }

  /* ---------- Rename a chat (used for auto-title on first message) ---------- */
  function renameChat(id, title) {
    if (!chats[id]) return false;
    chats[id].title = title.slice(0, 60);
    chats[id].updatedAt = Date.now();
    persist();
    return true;
  }

  /* ---------------------------------------------------------
     addMessage — appends a message to a chat.
     message = { role: "user"|"ai", text, attachments?, ts }
     Auto-titles the chat from the first user message if the
     chat still has the default "Nayi Chat" title.
  --------------------------------------------------------- */
  function addMessage(chatId, message) {
    const chat = chats[chatId];
    if (!chat) return false;

    chat.messages.push(message);
    chat.updatedAt = Date.now();

    if (chat.title === "Nayi Chat" && message.role === "user" && message.text) {
      chat.title = message.text.slice(0, 60);
    }

    persist();
    return true;
  }

  /* ---------- Update an existing message (used while streaming) ---------- */
  function updateMessage(chatId, messageIndex, patch) {
    const chat = chats[chatId];
    if (!chat || !chat.messages[messageIndex]) return false;
    Object.assign(chat.messages[messageIndex], patch);
    chat.updatedAt = Date.now();
    persist();
    return true;
  }

  /* ---------------------------------------------------------
     searchChats — matches query against chat titles and
     message text (case-insensitive).
  --------------------------------------------------------- */
  function searchChats(query) {
    const q = (query || "").trim().toLowerCase();
    const all = getAllChats();
    if (!q) return all;

    return all.filter(chat => {
      if (chat.title.toLowerCase().includes(q)) return true;
      return chat.messages.some(m => m.text && m.text.toLowerCase().includes(q));
    });
  }

  /* ---------- Clear all chats (used by a future "clear history" setting) ---------- */
  function clearAllChats() {
    chats = {};
    persist();
  }

  return {
    createChat,
    getChat,
    getAllChats,
    deleteChat,
    renameChat,
    addMessage,
    updateMessage,
    searchChats,
    clearAllChats
  };

})();