const multer = require("multer");

// Store files in memory (for buffer access)
const storage = multer.memoryStorage();

// Allow only PDFs and ZIPs
const allowedTypes = ["application/pdf", "application/zip"];

const fileFilter = (req, file, cb) => {
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Only PDF or ZIP files are allowed!"), false);
  }
  cb(null, true);
};

// Configure multer with 100MB limit
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter,
});

module.exports = upload;
