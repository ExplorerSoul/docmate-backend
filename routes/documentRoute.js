const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware"); // Multer config
const documentController = require("../controller/documentController");
const authMiddleware = require("../middleware/authMiddleware"); // JWT auth middleware

// Helper middleware to check if user is admin
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Helper middleware to check if user is student
const studentOnly = (req, res, next) => {
  if (req.user?.role !== 'student') {
    return res.status(403).json({ error: 'Student access required' });
  }
  next();
};

// ✅ Upload single document (PDF) - Admin only
router.post(
  "/document",
  authMiddleware,
  adminOnly,
  upload.single("file"), // field name should match frontend
  documentController.uploadDocument
);

// ✅ Bulk upload from ZIP file - Admin only
router.post(
  "/bulk-zip",
  authMiddleware,
  adminOnly,
  upload.single("file"), // frontend also sends "file" (not "zipFile")
  documentController.bulkUploadFromZip
);

// ✅ Fetch all uploaded documents - Admin only
router.get(
  "/",
  authMiddleware,
  adminOnly,
  documentController.getAllDocuments
);

// ✅ Students docs route - Student only (matches frontend call)
router.get(
  "/student", 
  authMiddleware, 
  studentOnly,
  documentController.getMyDocuments
);

// // ✅ Optional: Combined route that works for both admin and student
router.get(
  "/documents",
  authMiddleware,
  (req, res, next) => {
    // Route to appropriate controller based on role
    if (req.user?.role === 'admin') {
      return documentController.getAllDocuments(req, res, next);
    } else if (req.user?.role === 'student') {
      return documentController.getMyDocuments(req, res, next);
    } else {
      return res.status(403).json({ error: 'Unauthorized role' });
    }
  }
);

module.exports = router;