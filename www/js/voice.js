/* =========================================================
   AMIT AI — voice.js
   Speech-to-Text (mic input) + Text-to-Speech (read aloud).
   Talks to the rest of the app only via Utils.bus events —
   never reaches into chat.js internals directly.
   Depends on: utils.js
   ========================================================= */

window.Voice = (function () {

  let recognition = null;
  let isRecording = false;
  let micBtn = null;

  /* ---------------------------------------------------------
     setupRecognition — lazily creates the SpeechRecognition
     instance (some WebViews don't support it at all).
  --------------------------------------------------------- */
  function setupRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;

    const r = new SR();
    r.lang = "hi-IN";
    r.continuous = false;
    r.interimResults = true;

    r.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      Utils.bus.emit("voice:transcript", { text: transcript, isFinal: e.results[e.results.length - 1].isFinal });
    };

    r.onerror = (e) => {
      console.warn("[Voice] recognition error:", e.error);
      stopListening();
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        Utils.bus.emit("voice:error", "Mic ki permission allow karein taaki voice input kaam kare.");
      }
    };

    r.onend = () => {
      isRecording = false;
      updateMicButton();
    };

    return r;
  }

  function updateMicButton() {
    if (!micBtn) return;
    micBtn.classList.toggle("recording", isRecording);
  }

  function startListening() {
    if (!recognition) recognition = setupRecognition();
    if (!recognition) {
      Utils.bus.emit("voice:error", "Is browser/device me voice input support nahi hai.");
      return;
    }
    try {
      recognition.start();
      isRecording = true;
      updateMicButton();
    } catch (e) {
      // start() throws if already started — ignore
      console.warn("[Voice] start() failed:", e);
    }
  }

  function stopListening() {
    if (recognition && isRecording) {
      recognition.stop();
    }
    isRecording = false;
    updateMicButton();
  }

  function toggleListening() {
    if (isRecording) stopListening();
    else startListening();
  }

  /* ---------------------------------------------------------
     Text-to-Speech
  --------------------------------------------------------- */
  function speak(text) {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel(); // stop any ongoing speech first
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "hi-IN";
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function isSupported() {
    return {
      stt: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
      tts: "speechSynthesis" in window
    };
  }

  /* ---------------------------------------------------------
     init — wires up the mic button click. Actual insertion
     of recognized text into #text-input is handled by
     chat.js/app.js via the "voice:transcript" bus event —
     voice.js never touches #text-input directly.
  --------------------------------------------------------- */
  function init() {
    micBtn = document.getElementById("mic-btn");
    if (micBtn) {
      micBtn.addEventListener("click", toggleListening);
    }

    Utils.bus.on("voice:error", (msg) => {
      alert(msg);
    });
  }

  return {
    init,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
    isSupported
  };

})();