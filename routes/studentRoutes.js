const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getStudentModel } = require('../database/models/Student');

// Middleware to ensure only admins can proceed
const ensureAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  next();
};

// GET all students for the admin's institute
router.get('/', authMiddleware, ensureAdmin, async (req, res) => {
  try {
    const institute = req.user.institute;
    const Student = getStudentModel(institute);

    const students = await Student.find().sort({ createdAt: -1 }).lean();
    res.json(students);
  } catch (err) {
    console.error("❌ Error fetching students:", err);
    res.status(500).json({ error: 'Server error while fetching students' });
  }
});

// Approve a student by ID
router.post('/approve/:id', authMiddleware, ensureAdmin, async (req, res) => {
  try {
    if (!req.params.id) return res.status(400).json({ error: 'Student ID missing.' });

    const institute = req.user.institute;
    const Student = getStudentModel(institute);

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { status: 'active' },
      { new: true }
    );

    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ success: true, message: 'Student approved', student });
  } catch (err) {
    console.error("❌ Error approving student:", err);
    res.status(500).json({ error: 'Server error while approving student' });
  }
});

// Revoke/suspend a student by ID
router.post('/revoke/:id', authMiddleware, ensureAdmin, async (req, res) => {
  try {
    if (!req.params.id) return res.status(400).json({ error: 'Student ID missing.' });

    const institute = req.user.institute;
    const Student = getStudentModel(institute);

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { status: 'suspended' },
      { new: true }
    );

    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ success: true, message: 'Student suspended', student });
  } catch (err) {
    console.error("❌ Error revoking student:", err);
    res.status(500).json({ error: 'Server error while suspending student' });
  }
});

module.exports = router;
