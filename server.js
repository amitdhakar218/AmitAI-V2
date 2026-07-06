require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// ===== Middleware =====
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

// ===== Static Files =====
app.use(express.static(path.join(__dirname)));

// ===== Routes =====
const chatRoute = require("./server/routes/chat");

app.use("/api/chat", chatRoute);

// ===== Home =====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ===== Health Check =====
app.get("/api/ping", (req, res) => {
  res.json({
    success: true,
    app: "Amit AI",
    status: "Running"
  });
});

// ===== Start Server =====
app.listen(PORT, "0.0.0.0", () => {
  console.log("====================================");
  console.log("🚀 Amit AI Server Started");
  console.log(`🌐 http://localhost:${PORT}`);
  console.log("💬 Chat API : /api/chat");
  console.log("====================================");
});
