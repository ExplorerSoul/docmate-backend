const express = require("express");
const router = express.Router();

const { upload, multerErrorHandler } = require("../middleware/uploadMiddleware"); // Multer + error handler
const documentController = require("../controller/documentController");
const authMiddleware = require("../middleware/authMiddleware"); // JWT auth middleware

// ✅ Role-based middleware
const requireRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) {
    return res.status(403).json({ error: `Access denied. ${role} role required.` });
  }
  next();
};

// ✅ File type validators
const validatePDF = (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  if (!req.file.originalname.toLowerCase().endsWith(".pdf")) {
    return res.status(400).json({ error: "Only PDF files are allowed for this route." });
  }
  next();
};

const validateZIP = (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  if (!req.file.originalname.toLowerCase().endsWith(".zip")) {
    return res.status(400).json({ error: "Only ZIP files are allowed for bulk upload." });
  }
  next();
};

// ✅ Single PDF upload (Admin only)
router.post(
  "/document",
  authMiddleware,
  requireRole("admin"),
  upload.single("file"),
  validatePDF,
  documentController.uploadDocument
);

// ✅ Bulk ZIP upload (Admin only)
router.post(
  "/bulk-zip",
  authMiddleware,
  requireRole("admin"),
  upload.single("file"),
  validateZIP,
  documentController.bulkUploadFromZip
);

// ✅ Fetch all uploaded documents (Admin only)
router.get("/", authMiddleware, requireRole("admin"), documentController.getAllDocuments);

// ✅ Fetch student's own documents
router.get("/student", authMiddleware, requireRole("student"), documentController.getMyDocuments);

// ✅ Combined route for both roles
router.get("/documents", authMiddleware, (req, res) => {
  if (req.user?.role === "admin") return documentController.getAllDocuments(req, res);
  if (req.user?.role === "student") return documentController.getMyDocuments(req, res);
  return res.status(403).json({ error: "Access denied. Invalid role." });
});

// ✅ Global Multer error handler
router.use(multerErrorHandler);

module.exports = router;
