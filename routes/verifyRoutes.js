const express = require("express");
const router = express.Router();
const upload = require("../middleware/verifyMiddleware"); // memory storage for PDF
const { verifyCertificate } = require("../controller/verifyController");

// POST /api/verify
router.post("/", upload.single("file"), verifyCertificate);

module.exports = router;
