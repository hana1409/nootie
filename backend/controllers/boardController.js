const db = require("../config/db");

// GET /api/boards
// List semua board (shared workspace -> semua user login bisa lihat)
const getBoards = (req, res) => {
  const query = `
    SELECT
      b.id,
      b.title,
      b.visibility,
      b.created_at,
      b.updated_at,
      u.username AS created_by_username
    FROM boards b
    JOIN users u ON u.id = b.created_by
    ORDER BY b.updated_at DESC
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal mengambil daftar board" });
    }
    res.status(200).json({ boards: result });
  });
};

// GET /api/boards/:id
const getBoardById = (req, res) => {
  const { id } = req.params;

  db.query("SELECT * FROM boards WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal mengambil board" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Board tidak ditemukan" });
    }

    res.status(200).json({ board: result[0] });
  });
};

// POST /api/boards
// Body: { title }
const createBoard = (req, res) => {
  const { title } = req.body;
  const userId = req.user.id;
  const boardTitle = title?.trim() || "Untitled";

  db.query(
    "INSERT INTO boards (title, created_by, data) VALUES (?, ?, ?)",
    [boardTitle, userId, JSON.stringify({ notes: [], texts: [], shapes: [], stamps: [] })],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Gagal membuat board" });
      }

      const boardId = result.insertId;

      // Catat activity log
      db.query(
        "INSERT INTO activity_log (board_id, board_title, user_id, action, description) VALUES (?, ?, ?, 'created', ?)",
        [boardId, boardTitle, userId, `membuat board "${boardTitle}"`],
        (logErr) => {
          if (logErr) console.error("Gagal mencatat activity log:", logErr);
        }
      );

      res.status(201).json({
        message: "Board berhasil dibuat",
        board: { id: boardId, title: boardTitle },
      });
    }
  );
};

// DELETE /api/boards/:id
const deleteBoard = (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  db.query("SELECT title FROM boards WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal menghapus board" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Board tidak ditemukan" });
    }

    const boardTitle = result[0].title;

    db.query("DELETE FROM boards WHERE id = ?", [id], (delErr) => {
      if (delErr) {
        console.error(delErr);
        return res.status(500).json({ message: "Gagal menghapus board" });
      }

      // Catat activity log -> board_title disimpan sebagai snapshot,
      // jadi log "siapa menghapus board ini" tetap bertahan walau board sudah hilang
      db.query(
        "INSERT INTO activity_log (board_id, board_title, user_id, action, description) VALUES (?, ?, ?, 'deleted', ?)",
        [id, boardTitle, userId, `menghapus board "${boardTitle}"`],
        (logErr) => {
          if (logErr) console.error("Gagal mencatat activity log:", logErr);
        }
      );

      res.status(200).json({ message: "Board berhasil dihapus" });
    });
  });
};

// GET /api/boards/activity/recent
// Untuk panel notifikasi pojok kanan bawah: "User X menghapus Y jam sekian"
const getRecentActivity = (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  const query = `
    SELECT
      a.id,
      a.board_id,
      a.board_title,
      a.action,
      a.description,
      a.created_at,
      u.username
    FROM activity_log a
    JOIN users u ON u.id = a.user_id
    ORDER BY a.created_at DESC
    LIMIT ?
  `;

  db.query(query, [limit], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal mengambil activity log" });
    }
    res.status(200).json({ activity: result });
  });
};

// PUT /api/boards/:id
// Body: { data, title? } -> dipanggil oleh autosave dari Board.jsx
const updateBoard = (req, res) => {
  const { id } = req.params;
  const { data, title } = req.body;
  const userId = req.user.id;

  const fields = [];
  const values = [];

  if (data !== undefined) {
    fields.push("data = ?");
    values.push(JSON.stringify(data));
  }
  if (title !== undefined && title.trim()) {
    fields.push("title = ?");
    values.push(title.trim());
  }

  if (fields.length === 0) {
    return res.status(400).json({ message: "Tidak ada data untuk diupdate" });
  }

  values.push(id);

  db.query(
    `UPDATE boards SET ${fields.join(", ")} WHERE id = ?`,
    values,
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Gagal menyimpan board" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Board tidak ditemukan" });
      }

      // Catat activity log hanya saat title diubah (supaya tidak spam log setiap autosave)
      if (title !== undefined && title.trim()) {
        db.query(
          "INSERT INTO activity_log (board_id, board_title, user_id, action, description) VALUES (?, ?, ?, 'renamed', ?)",
          [id, title.trim(), userId, `mengubah nama board menjadi "${title.trim()}"`],
          (logErr) => {
            if (logErr) console.error("Gagal mencatat activity log:", logErr);
          }
        );
      }

      res.status(200).json({ message: "Board berhasil disimpan" });
    }
  );
};

module.exports = {
  getBoards,
  getBoardById,
  createBoard,
  updateBoard,
  deleteBoard,
  getRecentActivity,
};