const jwt = require("jsonwebtoken");

// ✅ Ek hi middleware file - auth.js delete kar do, sirf yahi use karo
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1]; // "Bearer <token>"

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "talkio_secret"
    );
    req.user = decoded; // { id, username }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
