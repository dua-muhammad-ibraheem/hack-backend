const express = require("express");

const Ticket = require("../models/Ticket");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();


// =====================================================
// CUSTOMER ROUTES
// =====================================================

// Create Ticket
router.post(
  "/",
  authMiddleware,
  roleMiddleware("customer"),
  async (req, res) => {
    try {
      const { subject, description, category } = req.body;

      if (!subject || !description) {
        return res.status(400).json({
          message: "Subject and description are required",
        });
      }

      if (subject.trim().length < 5) {
        return res.status(400).json({
          message: "Subject must be at least 5 characters long",
        });
      }

      if (description.trim().length < 10) {
        return res.status(400).json({
          message: "Description must be at least 10 characters long",
        });
      }

      const ticketNumber = `TKT-${Date.now()}`;

      const ticket = await Ticket.create({
        ticketNumber,
        subject: subject.trim(),
        description: description.trim(),
        category: category || "General",
        customer: req.user.userId,
      });

      res.status(201).json({
        message: "Ticket created successfully",
        ticket,
      });
    } catch (error) {
      console.error("Create ticket error:", error);

      res.status(500).json({
        message: "Failed to create ticket",
      });
    }
  }
);


// Get My Tickets
router.get(
  "/my-tickets",
  authMiddleware,
  roleMiddleware("customer"),
  async (req, res) => {
    try {
      const tickets = await Ticket.find({
        customer: req.user.userId,
      })
        .populate("assignedWorker", "name email")
        .sort({ createdAt: -1 });

      res.status(200).json({
        tickets,
      });
    } catch (error) {
      console.error("Get customer tickets error:", error);

      res.status(500).json({
        message: "Failed to fetch tickets",
      });
    }
  }
);


// Get Single My Ticket
router.get(
  "/my-tickets/:id",
  authMiddleware,
  roleMiddleware("customer"),
  async (req, res) => {
    try {
      const ticket = await Ticket.findOne({
        _id: req.params.id,
        customer: req.user.userId,
      }).populate("assignedWorker", "name email");

      if (!ticket) {
        return res.status(404).json({
          message: "Ticket not found",
        });
      }

      res.status(200).json({
        ticket,
      });
    } catch (error) {
      console.error("Get single ticket error:", error);

      res.status(500).json({
        message: "Failed to fetch ticket",
      });
    }
  }
);


// Update My Ticket
router.put(
  "/my-tickets/:id",
  authMiddleware,
  roleMiddleware("customer"),
  async (req, res) => {
    try {
      const { subject, description, category } = req.body;

      const ticket = await Ticket.findOne({
        _id: req.params.id,
        customer: req.user.userId,
      });

      if (!ticket) {
        return res.status(404).json({
          message: "Ticket not found",
        });
      }

      if (ticket.status !== "New") {
        return res.status(400).json({
          message: "Only new tickets can be updated",
        });
      }

      if (subject !== undefined) {
        if (subject.trim().length < 5) {
          return res.status(400).json({
            message: "Subject must be at least 5 characters long",
          });
        }

        ticket.subject = subject.trim();
      }

      if (description !== undefined) {
        if (description.trim().length < 10) {
          return res.status(400).json({
            message: "Description must be at least 10 characters long",
          });
        }

        ticket.description = description.trim();
      }

      if (category !== undefined) {
        ticket.category = category;
      }

      await ticket.save();

      res.status(200).json({
        message: "Ticket updated successfully",
        ticket,
      });
    } catch (error) {
      console.error("Update ticket error:", error);

      res.status(500).json({
        message: "Failed to update ticket",
      });
    }
  }
);


// Delete My Ticket
router.delete(
  "/my-tickets/:id",
  authMiddleware,
  roleMiddleware("customer"),
  async (req, res) => {
    try {
      const ticket = await Ticket.findOneAndDelete({
        _id: req.params.id,
        customer: req.user.userId,
      });

      if (!ticket) {
        return res.status(404).json({
          message: "Ticket not found",
        });
      }

      res.status(200).json({
        message: "Ticket deleted successfully",
      });
    } catch (error) {
      console.error("Delete ticket error:", error);

      res.status(500).json({
        message: "Failed to delete ticket",
      });
    }
  }
);


// =====================================================
// WORKER ROUTES
// =====================================================

// Get Assigned Tickets
router.get(
  "/worker-tickets",
  authMiddleware,
  roleMiddleware("worker"),
  async (req, res) => {
    try {
      const tickets = await Ticket.find({
        assignedWorker: req.user.userId,
      })
        .populate("customer", "name email")
        .sort({ createdAt: -1 });

      res.status(200).json({
        tickets,
      });
    } catch (error) {
      console.error("Get worker tickets error:", error);

      res.status(500).json({
        message: "Failed to fetch assigned tickets",
      });
    }
  }
);


// Worker Accept Ticket
router.put(
  "/:id/accept",
  authMiddleware,
  roleMiddleware("worker"),
  async (req, res) => {
    try {
      const ticket = await Ticket.findOne({
        _id: req.params.id,
        assignedWorker: req.user.userId,
      });

      if (!ticket) {
        return res.status(404).json({
          message: "Ticket not found or not assigned to you",
        });
      }

      if (ticket.status !== "Assigned") {
        return res.status(400).json({
          message: "This ticket cannot be accepted",
        });
      }

      ticket.status = "In Progress";

      await ticket.save();

      res.status(200).json({
        message: "Ticket accepted successfully",
        ticket,
      });
    } catch (error) {
      console.error("Accept ticket error:", error);

      res.status(500).json({
        message: "Failed to accept ticket",
      });
    }
  }
);


// Worker Reject Ticket
router.delete(
  "/:id/reject",
  authMiddleware,
  roleMiddleware("worker"),
  async (req, res) => {
    try {
      const ticket = await Ticket.findOneAndDelete({
        _id: req.params.id,
        assignedWorker: req.user.userId,
      });

      if (!ticket) {
        return res.status(404).json({
          message: "Ticket not found or not assigned to you",
        });
      }

      res.status(200).json({
        message: "Ticket rejected and permanently deleted",
      });
    } catch (error) {
      console.error("Reject ticket error:", error);

      res.status(500).json({
        message: "Failed to reject ticket",
      });
    }
  }
);


// Worker Resolve Ticket
router.put(
  "/:id/resolve",
  authMiddleware,
  roleMiddleware("worker"),
  async (req, res) => {
    try {
      const { resolutionNote } = req.body;

      const ticket = await Ticket.findOne({
        _id: req.params.id,
        assignedWorker: req.user.userId,
      });

      if (!ticket) {
        return res.status(404).json({
          message: "Ticket not found or not assigned to you",
        });
      }

      if (ticket.status !== "In Progress") {
        return res.status(400).json({
          message: "Only in-progress tickets can be resolved",
        });
      }

      ticket.status = "Resolved";
      ticket.resolutionNote = resolutionNote?.trim() || "";

      await ticket.save();

      res.status(200).json({
        message: "Ticket resolved successfully",
        ticket,
      });
    } catch (error) {
      console.error("Resolve ticket error:", error);

      res.status(500).json({
        message: "Failed to resolve ticket",
      });
    }
  }
);


module.exports = router;