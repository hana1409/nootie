const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  port: 3307,
  password: "",
  database: "nootie",
});

db.connect((err) => {
  if (err) {
    console.log("Database Error:", err);
    return;
  }

  console.log("MySQL Connected");

  // Tabel users (auth)
  db.query(
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    (err) => {
      if (err) console.log("Error creating users table:", err);
      else console.log("Users table ready");
    }
  );

  // Tabel boards
  // visibility disiapkan untuk fitur private/share-link nanti (default 'shared')
  db.query(
    `CREATE TABLE IF NOT EXISTS boards (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL DEFAULT 'Untitled',
      created_by INT NOT NULL,
      visibility ENUM('shared', 'private', 'link') NOT NULL DEFAULT 'shared',
      data JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )`,
    (err) => {
      if (err) console.log("Error creating boards table:", err);
      else console.log("Boards table ready");
    }
  );

  // Tabel activity_log -> dipakai untuk notifikasi "siapa edit/hapus jam berapa" (tahap 2)
  // board_id SENGAJA tidak diberi FOREIGN KEY ke boards(id): kalau board dihapus,
  // kita tetap ingin riwayat "siapa menghapus board ini" bertahan permanen.
  // board_title disimpan langsung di sini (snapshot) supaya log tetap terbaca
  // walau board aslinya sudah tidak ada.
  db.query(
    `CREATE TABLE IF NOT EXISTS activity_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      board_id INT NOT NULL,
      board_title VARCHAR(255) NOT NULL,
      user_id INT NOT NULL,
      action ENUM('created', 'edited', 'deleted', 'renamed') NOT NULL,
      description VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    (err) => {
      if (err) console.log("Error creating activity_log table:", err);
      else console.log("Activity log table ready");
    }
  );
});

module.exports = db;