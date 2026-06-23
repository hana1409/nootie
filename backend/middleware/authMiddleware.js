const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "nootie_secret_key_change_this";

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token tidak ditemukan" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token tidak valid atau sudah expired" });
  }
}

module.exports = verifyToken;