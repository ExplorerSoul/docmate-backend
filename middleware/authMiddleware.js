const jwt = require("jsonwebtoken");
const config = require("../loaders/config");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  // 🔐 Check for Bearer token
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization token missing or malformed." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    const { email, role, institute, regdNo, _id } = decoded;

    // 🚫 Validate required payload fields
    if (!email || !role || !institute) {
      return res.status(403).json({ error: "Invalid token payload. Missing email, role or institute." });
    }

    // 🔍 Ensure userId exists
    const userId = _id || decoded.id || null;
    if (!userId) {
      return res.status(403).json({ error: "Token does not contain user ID (_id)." });
    }

    // ✅ Attach user info to request
    req.user = {
      _id: userId,
      email,
      role,
      institute,
      regdNo: regdNo || null,
      isAdmin: role === "admin",
      isStudent: role === "student"
    };

    // 🔔 Attach optional notification context
    req.notificationContext = {
      recipientId: userId,
      recipientRole: role,
      recipientInstitute: institute
    };

    return next();
  } catch (err) {
    console.error("❌ Auth error:", err.message);

    // 🎯 Handle common JWT errors
    if (err.name === "TokenExpiredError") {
      return res.status(403).json({ error: "Session expired. Please log in again." });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(403).json({ error: "Invalid authentication token." });
    }

    return res.status(403).json({ error: "Unauthorized access." });
  }
};
