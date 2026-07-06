/* =========================================================
   AMIT AI — memory.js
   Local "AI memory" — small persisted facts about the user
   (name, preferences, project context) stored separately
   from chat history. Backend-agnostic: just hands chat.js
   a text block to send along with each message.
   Depends on: utils.js
   ========================================================= */

window.Memory = (function () {

  const STORAGE_KEY = "amitai_memory";
  const MAX_MEMORIES = 200;

  let memories = Utils.storage.get(STORAGE_KEY, []);

  function persist() {
    Utils.storage.set(STORAGE_KEY, memories);
  }

  /* ---------- Add a new memory fact ---------- */
  function add(text) {
    if (!text || !text.trim()) return null;
    const item = {
      id: Utils.uid("mem"),
      text: text.trim(),
      createdAt: Date.now()
    };
    memories.push(item);
    if (memories.length > MAX_MEMORIES) {
      memories = memories.slice(memories.length - MAX_MEMORIES);
    }
    persist();
    Utils.bus.emit("memory:updated", memories);
    return item;
  }

  /* ---------- Get all memories ---------- */
  function getAll() {
    return memories.slice();
  }

  /* ---------- Update an existing memory ---------- */
  function update(id, newText) {
    const m = memories.find(x => x.id === id);
    if (!m) return false;
    m.text = newText.trim();
    m.updatedAt = Date.now();
    persist();
    Utils.bus.emit("memory:updated", memories);
    return true;
  }

  /* ---------- Delete a memory ---------- */
  function remove(id) {
    const before = memories.length;
    memories = memories.filter(x => x.id !== id);
    if (memories.length !== before) {
      persist();
      Utils.bus.emit("memory:updated", memories);
      return true;
    }
    return false;
  }

  /* ---------- Clear all memories ---------- */
  function clearAll() {
    memories = [];
    persist();
    Utils.bus.emit("memory:updated", memories);
  }

  /* ---------------------------------------------------------
     buildMemoryContext — turns stored memories into a short
     text block that api.js can send alongside the user's
     message, so your backend model has persistent context
     about the user (name, preferences, ongoing project etc).

     Example output:
       "User ke baare me yaad rakhi gayi baatein:
        - User ka naam Amit hai
        - User Android + Termux par AI assistant bana raha hai"
  --------------------------------------------------------- */
  function buildMemoryContext(limit) {
    if (memories.length === 0) return "";
    const recent = memories.slice(-(limit || 20));
    const lines = recent.map(m => "- " + m.text);
    return "User ke baare me yaad rakhi gayi baatein:\n" + lines.join("\n");
  }

  /* ---------------------------------------------------------
     autoCapture — very simple heuristic scanner that looks
     at a user's message and auto-saves obvious "remember this"
     style statements, e.g. "mera naam Amit hai" or
     "please remember ...". Basic pattern-matching only —
     your backend model can later replace/improve this.
  --------------------------------------------------------- */
  function autoCapture(userText) {
    if (!userText) return;
    const triggers = [
      /mera naam (.+)/i,
      /remember (that )?(.+)/i,
      /yaad rakhna (.+)/i,
      /mujhe (.+) pasand hai/i
    ];
    for (const regex of triggers) {
      const match = userText.match(regex);
      if (match) {
        add(userText.trim());
        break;
      }
    }
  }

  return {
    add,
    getAll,
    update,
    remove,
    clearAll,
    buildMemoryContext,
    autoCapture
  };

})();