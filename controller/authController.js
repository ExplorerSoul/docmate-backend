const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../loaders/config');
const { getStudentModel } = require('../database/models/Student');
const Admin = require('../database/models/AdminDB');

// ✅ SIGNUP FUNCTION
const signup = async (req, res) => {
  const { role } = req.body;

  try {
    if (role === 'student') {
      let { name, regdNo, email, password, institute } = req.body;

      if (!name || !regdNo || !email || !password || !institute) {
        return res.status(400).json({ message: 'Missing student fields' });
      }

      email = email.trim().toLowerCase();
      institute = institute.trim().toLowerCase();
      const Student = getStudentModel(institute);

      const existing = await Student.findOne({
        $or: [{ email }, { regdNo }]
      });

      if (existing) {
        return res.status(409).json({ message: 'Email or Regd No. already exists for this institute' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const student = new Student({
        name,
        regdNo,
        email,
        password: hashedPassword,
        institute,
        role: 'student',
        status: 'pending'
      });

      await student.save();
      return res.status(201).json({ message: 'Student signup successful! Awaiting admin approval.' });

    } else if (role === 'admin') {
      let { email, password, institute } = req.body;

      if (!email || !password || !institute) {
        return res.status(400).json({ message: 'Missing required admin fields' });
      }

      email = email.trim().toLowerCase();
      institute = institute.trim().toLowerCase();

      const emailExists = await Admin.findOne({ email });
      if (emailExists) {
        return res.status(409).json({ message: 'Admin already registered with this email' });
      }

      const instituteExists = await Admin.findOne({ institute });
      if (instituteExists) {
        return res.status(409).json({ message: 'An admin already exists for this institute' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const admin = new Admin({
        email,
        institute,
        password: hashedPassword,
        role: 'admin',
        isVerified: true
      });

      await admin.save();
      return res.status(201).json({ message: 'Admin signup successful! You can now log in.' });

    } else {
      return res.status(400).json({ message: 'Invalid role provided' });
    }

  } catch (err) {
    console.error('❌ Signup error:', err);
    return res.status(500).json({ message: 'Server error during signup.' });
  }
};

// ✅ LOGIN FUNCTION
const login = async (req, res) => {
  try {
    const { email, regdNo, password, institute, role } = req.body;
    let user;

    if (role === 'student') {
      if (!email || !regdNo || !password || !institute) {
        return res.status(400).json({ message: 'Missing email, regdNo, password, or institute' });
      }

      const Student = getStudentModel(institute.trim().toLowerCase());
      user = await Student.findOne({ email, regdNo });

      if (!user) {
        return res.status(404).json({ message: 'Student not found. Check credentials.' });
      }

      if (user.status === 'pending') {
        return res.status(403).json({ message: 'Account pending admin approval', status: 'pending' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ message: 'Account suspended. Contact admin.', status: 'suspended' });
      }

    } else if (role === 'admin') {
      if (!email || !password) {
        return res.status(400).json({ message: 'Missing email or password' });
      }

      user = await Admin.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: 'Admin not found.' });
      }

      if (!user.isVerified) {
        return res.status(403).json({ message: 'Admin not verified yet.' });
      }

    } else {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const payload = {
      _id: user._id,
      email: user.email,
      institute: user.institute,
      role: user.role || role,
      regdNo: user.regdNo || null,
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '6h' });

    return res.status(200).json({
      message: 'Login successful!',
      token,
      name: user.name || user.email,
      email: user.email,
      regdNo: user.regdNo || undefined,
      institute: user.institute,
      role: user.role || role,
      status: user.status || 'active'
    });

  } catch (err) {
    console.error('❌ Login error:', err);
    return res.status(500).json({ message: 'Something went wrong during login.' });
  }
};


module.exports = {
  signup,
  login,
};
