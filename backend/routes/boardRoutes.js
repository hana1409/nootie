const express = require("express");
const router = express.Router();

const controller = require("../controllers/boardController");
const verifyToken = require("../middleware/authMiddleware");

router.get("/", verifyToken, controller.getBoards);
router.get("/activity/recent", verifyToken, controller.getRecentActivity);
router.get("/:id", verifyToken, controller.getBoardById);
router.post("/", verifyToken, controller.createBoard);
router.put("/:id", verifyToken, controller.updateBoard);
router.delete("/:id", verifyToken, controller.deleteBoard);

module.exports = router;