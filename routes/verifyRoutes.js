const express = require("express");
const router = express.Router();

const { upload, multerErrorHandler } = require("../middleware/verifyMiddleware");
const { verifyCertificate } = require("../controller/verifyController");

// ✅ POST /api/verify - Verify uploaded PDF document (hash/Merkle proof)
router.post(
  "/",
  upload.single("file"),       // Upload PDF in-memory
  multerErrorHandler,          // Catch multer errors (file size, format, etc.)
  verifyCertificate            // Main logic to verify document
);

module.exports = router;
