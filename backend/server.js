const express = require("express");
const cors = require("cors");

require("./config/db"); // inisialisasi koneksi + auto-create tabel

const authRoutes = require("./routes/authRoutes");
const boardRoutes = require("./routes/boardRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
