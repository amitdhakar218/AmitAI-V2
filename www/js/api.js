window.Api = (function () {

  const CHAT_ENDPOINT = "/api/chat";

  async function sendMessage(userText, attachments = []) {

    const res = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: userText,
        attachments
      })
    });

    const data = await res.json();
    return data.reply || "No reply";
  }

  async function streamMessage(userText, attachments, onChunk, onDone, onError) {

    try {

      const reply = await sendMessage(userText, attachments);

      onChunk(reply, reply);

      onDone(reply);

    } catch (err) {

      console.error(err);

      if (onError) {
        onError("❌ Server Error");
      }

    }

    return {
      abort() {}
    };

  }

  function cancelStream(controller) {

    if (controller && controller.abort) {
      controller.abort();
    }

  }

  return {

    sendMessage,
    streamMessage,
    cancelStream

  };

})();
