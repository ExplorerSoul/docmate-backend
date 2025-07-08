// middlewares/verifyMiddleware.js
const multer = require("multer");

// ✅ Store uploaded files in memory for hashing
const storage = multer.memoryStorage();

// ✅ Allow only PDF files
const fileFilter = (req, file, cb) => {
  if (file.mimetype !== "application/pdf") {
    return cb(new Error("Only PDF files are allowed for verification."), false);
  }
  cb(null, true);
};

// ✅ Configure multer for file size & file type limits
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Max 10 MB
  },
  fileFilter,
});

module.exports = upload;
