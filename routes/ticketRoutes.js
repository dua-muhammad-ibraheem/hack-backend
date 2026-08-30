
const express = require("express");

const Ticket = require("../models/Ticket");
const User = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();


// =====================================================
// GET WORKERS
// =====================================================

router.get(
  "/workers",
  authMiddleware,
  roleMiddleware("customer"),
  async (req, res) => {
    try {
      const workers = await User.find(
        { role: "worker" },
        {
          name: 1,
          email: 1,
        }
      ).sort({ name: 1 });

      res.status(200).json({
        workers,
      });
    } catch (error) {
      console.error("Fetch workers error:", error);

      res.status(500).json({
        message: "Failed to fetch workers",
      });
    }
  }
);


// =====================================================
// GET WORKER REQUESTS
// Worker ko sirf uski assigned requests milengi
// =====================================================

router.get(
  "/workers",
  authMiddleware,
  roleMiddleware("customer"),
  async (req, res) => {
    try {
      const { category } = req.query;

      const filter = {
        role: "worker",
      };

      if (category) {
        filter.category = category;
      }

      const workers = await User.find(
        filter,
        {
          name: 1,
          email: 1,
          category: 1,
        }
      )
        .sort({ name: 1 })
        .limit(2);

      res.status(200).json({
        workers,
      });
    } catch (error) {
      console.error("Fetch workers error:", error);

      res.status(500).json({
        message: "Failed to fetch workers",
      });
    }
  }
);
// =====================================================
// ACCEPT REQUEST
// Assigned → In Progress
// =====================================================

router.patch(
  "/:id/accept",
  authMiddleware,
  roleMiddleware("worker"),
  async (req, res) => {
    try {
      const ticket = await Ticket.findOne({
        _id: req.params.id,
        assignedAgent: req.user.userId,
      });

      if (!ticket) {
        return res.status(404).json({
          message: "Request not found",
        });
      }

      if (ticket.status !== "Assigned") {
        return res.status(400).json({
          message: "This request cannot be accepted",
        });
      }

      ticket.status = "In Progress";

      await ticket.save();

      res.status(200).json({
        message: "Request accepted successfully",
        ticket,
      });
    } catch (error) {
      console.error("Accept request error:", error);

      res.status(500).json({
        message: "Failed to accept request",
      });
    }
  }
);


// =====================================================
// REJECT REQUEST
// Rejected request permanently delete hogi
// =====================================================

router.delete(
  "/:id/reject",
  authMiddleware,
  roleMiddleware("worker"),
  async (req, res) => {
    try {
      const ticket = await Ticket.findOne({
        _id: req.params.id,
        assignedAgent: req.user.userId,
      });

      if (!ticket) {
        return res.status(404).json({
          message: "Request not found",
        });
      }

      if (ticket.status !== "Assigned") {
        return res.status(400).json({
          message: "Only assigned requests can be rejected",
        });
      }

      await Ticket.findByIdAndDelete(ticket._id);

      res.status(200).json({
        message: "Request rejected successfully",
      });
    } catch (error) {
      console.error("Reject request error:", error);

      res.status(500).json({
        message: "Failed to reject request",
      });
    }
  }
);


// =====================================================
// COMPLETE REQUEST
// In Progress → Resolved
// =====================================================

router.patch(
  "/:id/complete",
  authMiddleware,
  roleMiddleware("worker"),
  async (req, res) => {
    try {
      const ticket = await Ticket.findOne({
        _id: req.params.id,
        assignedAgent: req.user.userId,
      });

      if (!ticket) {
        return res.status(404).json({
          message: "Request not found",
        });
      }

      if (ticket.status !== "In Progress") {
        return res.status(400).json({
          message: "Only in-progress requests can be completed",
        });
      }

      ticket.status = "Resolved";

      await ticket.save();

      res.status(200).json({
        message: "Request completed successfully",
        ticket,
      });
    } catch (error) {
      console.error("Complete request error:", error);

      res.status(500).json({
        message: "Failed to complete request",
      });
    }
  }
);


module.exports = router;

