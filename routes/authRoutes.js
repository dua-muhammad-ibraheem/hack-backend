
const express = require("express");

const {
  registerUser,
  loginUser,
  createAdmin,
  createWorker,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();


// =========================
// Customer Registration
// =========================
router.post("/register", registerUser);


// =========================
// Login
// =========================
router.post("/login", loginUser);


// =========================
// One-Time Admin Setup
// =========================
router.post("/setup-admin", createAdmin);


// =========================
// Create Worker
// Only Admin
// =========================
router.post(
  "/create-worker",
  authMiddleware,
  roleMiddleware("admin"),
  createWorker
);


// =========================
// Protected Profile
// =========================
router.get(
  "/profile",
  authMiddleware,
  (req, res) => {
    res.status(200).json({
      message: "You are authenticated",
      userId: req.user.userId,
      role: req.user.role,
    });
  }
);


module.exports = router;

