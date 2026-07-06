const express = require("express");

const router = express.Router();

// Temporary AI Response
router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message is required"
      });
    }

    // Temporary reply
    const reply = `🤖 Amit AI received: ${message}`;

    res.json({
      success: true,
      reply
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: "Internal Server Error"
    });
  }
});

module.exports = router;
