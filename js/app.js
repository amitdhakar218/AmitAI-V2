/* =========================================================
   AMIT AI — app.js
   Entry point. Boots every module in the correct order and
   decides what to show on first load. No feature logic here.
   Depends on: every other module (loaded before this one
   in index.html's <script> order).
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  try {
    // ---- Init order matters: ----
    // Theme first (avoids a flash of wrong colors),
    // then input-related modules (Voice, Upload),
    // then Sidebar (needs History data ready),
    // then Chat last (wires input bar + listens to
    // events emitted by Sidebar/Upload/Voice).

    Theme.init();
    Voice.init();
    Upload.init();
    Sidebar.init();
    Chat.init();

    // ---- Resume last chat, or start a new one ----
    const allChats = History.getAllChats();
    if (allChats.length > 0) {
      Chat.openChat(allChats[0].id);
    } else {
      Chat.startNewChat();
    }

    console.log("✅ Amit AI initialized successfully.");
  } catch (err) {
    console.error("❌ Amit AI failed to initialize:", err);
    alert("Amit AI load karne me error aayi. Console check karein.");
  }

});