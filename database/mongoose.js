const mongoose = require("mongoose");
const logger = require("../services/logger");
const config = require("../loaders/config");

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongodbURI, {
      // No need for useNewUrlParser or useUnifiedTopology anymore
    });
    logger.info("✅ MongoDB connected successfully");
  } catch (err) {
    logger.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
