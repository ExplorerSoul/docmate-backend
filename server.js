require("dotenv").config(); // Load env vars early

// Ensure critical env vars are present
if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
  console.error("❌ Missing required environment variables.");
  process.exit(1);
}

const express = require("express");
const cors = require("cors");
const logger = require("./services/logger");
const connectDB = require("./database/mongoose");

const app = express();
const PORT = process.env.PORT || 5000;

// 🔌 Connect MongoDB
connectDB();

// 🔧 Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  // credentials: false
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🛣️ API Routes
app.use("/api/upload", require("./routes/documentRoute"));
app.use("/api/verify", require("./routes/verifyRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/files", require("./routes/fileRoutes"));
app.use("/api/students", require("./routes/studentRoutes"));

// 🏠 Root
app.get("/", (req, res) => {
  res.send("📄 Academic DMS backend running!");
});

// ❌ 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ❗ Global Error Handler
app.use((err, req, res, next) => {
  logger.error(err.stack || err.message || err);
  res.status(500).json({ error: "Internal server error." });
});

// 🚀 Start Server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
