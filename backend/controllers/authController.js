const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Ganti dengan secret yang aman, simpan di .env (process.env.JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET || "nootie_secret_key_change_this";

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email, dan password wajib diisi",
      });
    }

    db.query(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [email, username],
      async (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Terjadi kesalahan server" });
        }

        if (result.length > 0) {
          return res.status(400).json({
            message: "Username atau email sudah digunakan",
          });
        }

        try {
          const hashedPassword = await bcrypt.hash(password, 10);

          db.query(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            [username, email, hashedPassword],
            (err, result) => {
              if (err) {
                console.error(err);
                return res
                  .status(500)
                  .json({ message: "Terjadi kesalahan server" });
              }

              res.status(201).json({
                message: "Register berhasil",
              });
            }
          );
        } catch (hashError) {
          console.error(hashError);
          res.status(500).json({ message: "Terjadi kesalahan server" });
        }
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username dan password wajib diisi",
      });
    }

    db.query(
      "SELECT * FROM users WHERE username = ?",
      [username],
      async (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Terjadi kesalahan server" });
        }

        if (result.length === 0) {
          return res.status(400).json({
            message: "Username atau password salah",
          });
        }

        const user = result[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          return res.status(400).json({
            message: "Username atau password salah",
          });
        }

        const token = jwt.sign(
          { id: user.id, username: user.username, email: user.email },
          JWT_SECRET,
          { expiresIn: "1d" }
        );

        // Tidak mengirim password ke client
        res.status(200).json({
          message: "Login berhasil",
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

module.exports = {
  register,
  login,
};