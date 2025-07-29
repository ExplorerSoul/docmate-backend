const multer = require("multer");
const path = require("path");

// ✅ Use memory storage for S3 uploads (buffer available)
const storage = multer.memoryStorage();

// ✅ Allowed file types
const allowedMimeTypes = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed"
];
const allowedExtensions = [".pdf", ".zip"];

// ✅ File validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;

  if (allowedMimeTypes.includes(mimetype) && allowedExtensions.includes(ext)) {
    return cb(null, true);
  }

  return cb(new Error(`Invalid file type: ${ext}. Only PDF and ZIP files are allowed.`), false);
};

// ✅ Multer instance with file size limit
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB
});

// ✅ Global error handler for Multer
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    let message;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File size too large. Maximum allowed is 100MB.";
    } else {
      message = `Multer error: ${err.message}`;
    }
    return res.status(400).json({ error: message });
  } else if (err) {
    // Other errors
    return res.status(400).json({ error: err.message });
  }
  next();
};

module.exports = {
  upload,
  multerErrorHandler
};
