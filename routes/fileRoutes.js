const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getFileModel } = require('../database/models/FileSchema');
const { getPresignedFileUrl } = require("../controller/fileController");
const studentAuthMiddleware = require("../middleware/studentAuthMiddleware");


// 🔐 Admin-only: GET /api/files => get all files for institute
router.get('/', authMiddleware, async (req, res) => {
  const { institute, role } = req.user;

  if (!institute) {
    return res.status(400).json({ error: 'Institute information missing in token.' });
  }

  if (role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }

  try {
    const File = getFileModel(institute);
    const files = await File.find().sort({ createdAt: -1 }).lean();

    console.log(`📄 Admin fetched ${files.length} files for institute: ${institute}`);
    res.status(200).json({
      documents: files,
      count: files.length
    });
  } catch (err) {
    console.error("❌ Error fetching files:", err.message);
    res.status(500).json({ error: 'Server error while fetching files' });
  }
});

// 👩‍🎓 Student-only: GET /api/files/student => get only their own documents
router.get('/student', authMiddleware, async (req, res) => {
  const { institute, role, regdNo } = req.user;

  if (!institute) {
    return res.status(400).json({ error: 'Institute information missing in token.' });
  }

  if (role !== 'student') {
    return res.status(403).json({ error: 'Access denied. Students only.' });
  }

  if (!regdNo) {
    return res.status(400).json({ error: 'Registration number missing in token.' });
  }

  try {
    const File = getFileModel(institute);
    const files = await File.find({ regdNo }).sort({ createdAt: -1 }).lean();

    console.log(`📄 Student ${regdNo} fetched ${files.length} files`);
    res.status(200).json({
      documents: files,
      count: files.length
    });
  } catch (err) {
    console.error("❌ Error fetching documents:", err.message);
    res.status(500).json({ error: 'Server error while fetching documents' });
  }
});

// router.get("/presigned/*", studentAuthMiddleware, getPresignedFileUrl);

module.exports = router;
