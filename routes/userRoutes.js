const express = require("express");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const users = await User.find({}, { name: 1, email: 1, role: 1, specialization: 1 }).sort({
      role: 1,
    });
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.get("/workers", authMiddleware, async (req, res) => {
  try {
    const { specialization } = req.query;

    const filter = {
      role: "worker",
    };

    if (specialization) {
      filter.specialization = specialization;
    }

    const workers = await User.find(filter)
      .select("_id name email specialization")
      .sort({ name: 1 });

    res.status(200).json({
      workers,
    });
  } catch (error) {
    console.error("Get workers error:", error);

    res.status(500).json({
      message: "Failed to fetch workers",
    });
  }
});

router.post(
  "/workers",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const { name, email, password, specialization } = req.body;

      if (!name || !email || !password || !specialization) {
        return res.status(400).json({
          message: "Name, email, password and specialization are required",
        });
      }

      const validSpecializations = [
        "Billing",
        "Account",
        "Technical",
        "Orders",
        "General",
      ];

      if (!validSpecializations.includes(specialization)) {
        return res.status(400).json({
          message: "Invalid specialization",
        });
      }

      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({
          message: "User with this email already exists",
        });
      }

      const bcrypt = require("bcryptjs");

      const hashedPassword = await bcrypt.hash(password, 10);

      const worker = await User.create({
        name,
        email,
        password: hashedPassword,
        role: "worker",
        specialization,
      });

      res.status(201).json({
        message: "Worker created successfully",
        worker: {
          id: worker._id,
          name: worker.name,
          email: worker.email,
          role: worker.role,
          specialization: worker.specialization,
        },
      });
    } catch (error) {
      console.error("Create worker error:", error);

      res.status(500).json({
        message: "Failed to create worker",
        error: error.message,
      });
    }
  }
);

// Admin deletes a user account (cannot delete another admin)
router.delete("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser.role === "admin") {
      return res.status(403).json({ message: "Cannot delete an admin account" });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

module.exports = router;