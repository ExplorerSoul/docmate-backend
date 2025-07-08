const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer(); // for parsing multipart/form-data
const { verifyPublicDocument } = require("../controller/verifyPublicController");

router.post("/", upload.single("file"), verifyPublicDocument);

module.exports = router;
