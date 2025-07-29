const multer = require("multer");
const path = require("path");

// ✅ In-memory storage
const storage = multer.memoryStorage();

// ✅ Only allow PDF files
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isPDF = file.mimetype === "application/pdf" && ext === ".pdf";

  if (isPDF) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF files are allowed."), false);
  }
};

// ✅ Max file size from env or default 10MB
const maxFileSize = parseInt(process.env.VERIFY_MAX_SIZE_MB || "10") * 1024 * 1024;

const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter,
});

// ✅ Multer error handler
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: `File too large. Max size is ${process.env.VERIFY_MAX_SIZE_MB || 10} MB.` });
    }
    return res.status(400).json({ error: `Multer error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

module.exports = { upload, multerErrorHandler };
