const express = require("express");

const Ticket = require("../models/Ticket");
const User = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();


// =====================================================
// CUSTOMER
// =====================================================

// Create Complaint / Request
router.post(
  "/",
  authMiddleware,
  roleMiddleware("customer"),
  async (req, res) => {
    try {
      const { subject, description, category, priority } = req.body;

      if (!subject || !description || !category) {
        return res.status(400).json({
          message: "Subject, description and category are required",
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

      const ticket = await Ticket.create({
        ticketNumber: `TKT-${Date.now()}`,
        subject: subject.trim(),
        description: description.trim(),
        category: category.trim(),
        priority: priority || "Medium",
        customer: req.user.userId,
      });

      res.status(201).json({
        message: "Request created successfully",
        ticket,
      });
    } catch (error) {
      console.error("Create ticket error:", error);

      res.status(500).json({
        message: "Failed to create request",
      });
    }
  }
);


// Get Workers Available For Category
router.get(
  "/workers",
  authMiddleware,
  roleMiddleware("customer"),
  async (req, res) => {
    try {
      const { category } = req.query;

      if (!category) {
        return res.status(400).json({
          message: "Category is required",
        });
      }

      const workers = await User.find({
        role: "worker",
        workerCategories: category,
      }).select("_id name email workerCategories");

      res.status(200).json({
        workers,
      });
    } catch (error) {
      console.error("Get workers error:", error);

      res.status(500).json({
        message: "Failed to fetch workers",
      });
    }
  }
);


// Assign Worker To My Ticket
router.put(
  "/my-tickets/:id/assign-worker",
  authMiddleware,
  roleMiddleware("customer"),
  async (req, res) => {
    try {
      const { workerId } = req.body;

      if (!workerId) {
        return res.status(400).json({
          message: "Worker is required",
        });
      }

      const ticket = await Ticket.findOne({
        _id: req.params.id,
        customer: req.user.userId,
      });

      if (!ticket) {
        return res.status(404).json({
          message: "Ticket not found",
        });
      }

      if (ticket.status !== "Pending") {
        return res.status(400).json({
          message: "Only pending requests can be assigned",
        });
      }

      const worker = await User.findOne({
        _id: workerId,
        role: "worker",
        workerCategories: ticket.category,
      });

      if (!worker) {
        return res.status(400).json({
          message: "Selected worker is not available for this category",
        });
      }

      ticket.assignedWorker = worker._id;

      await ticket.save();

      res.status(200).json({
        message: "Worker assigned successfully",
        ticket,
      });
    } catch (error) {
      console.error("Assign worker error:", error);

      res.status(500).json({
        message: "Failed to assign worker",
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
      console.error("Get ticket error:", error);

      res.status(500).json({
        message: "Failed to fetch ticket",
      });
    }
  }
);


// Update My Pending Ticket
router.put(
  "/my-tickets/:id",
  authMiddleware,
  roleMiddleware("customer"),
  async (req, res) => {
    try {
      const { subject, description, category, priority } = req.body;

      const ticket = await Ticket.findOne({
        _id: req.params.id,
        customer: req.user.userId,
      });

      if (!ticket) {
        return res.status(404).json({
          message: "Ticket not found",
        });
      }

      if (ticket.status !== "Pending") {
        return res.status(400).json({
          message: "Only pending requests can be updated",
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
        ticket.category = category.trim();
        ticket.assignedWorker = null;
      }

      if (priority !== undefined) {
        ticket.priority = priority;
      }

      await ticket.save();

      res.status(200).json({
        message: "Request updated successfully",
        ticket,
      });
    } catch (error) {
      console.error("Update ticket error:", error);

      res.status(500).json({
        message: "Failed to update request",
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
        message: "Request deleted successfully",
      });
    } catch (error) {
      console.error("Delete ticket error:", error);

      res.status(500).json({
        message: "Failed to delete request",
      });
    }
  }
);


// =====================================================
// WORKER
// =====================================================

// Get Assigned Requests
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
        message: "Failed to fetch worker requests",
      });
    }
  }
);


// Accept Request
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
          message: "Request not found or not assigned to you",
        });
      }

      if (ticket.status !== "Pending") {
        return res.status(400).json({
          message: "Only pending requests can be accepted",
        });
      }

      ticket.status = "Accepted";

      await ticket.save();

      res.status(200).json({
        message: "Request accepted",
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


// Reject Request Permanently
router.delete(
  "/:id/reject",
  authMiddleware,
  roleMiddleware("worker"),
  async (req, res) => {
    try {
      const ticket = await Ticket.findOneAndDelete({
        _id: req.params.id,
        assignedWorker: req.user.userId,
        status: "Pending",
      });

      if (!ticket) {
        return res.status(404).json({
          message: "Request not found or cannot be rejected",
        });
      }

      res.status(200).json({
        message: "Request rejected permanently",
      });
    } catch (error) {
      console.error("Reject request error:", error);

      res.status(500).json({
        message: "Failed to reject request",
      });
    }
  }
);


// Start Request
router.put(
  "/:id/start",
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
          message: "Request not found or not assigned to you",
        });
      }

      if (ticket.status !== "Accepted") {
        return res.status(400).json({
          message: "Only accepted requests can be started",
        });
      }

      ticket.status = "In Progress";

      await ticket.save();

      res.status(200).json({
        message: "Request is now in progress",
        ticket,
      });
    } catch (error) {
      console.error("Start request error:", error);

      res.status(500).json({
        message: "Failed to start request",
      });
    }
  }
);


// Complete Request
router.put(
  "/:id/complete",
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
          message: "Request not found or not assigned to you",
        });
      }

      if (ticket.status !== "In Progress") {
        return res.status(400).json({
          message: "Only in-progress requests can be completed",
        });
      }

      ticket.status = "Completed";
      ticket.resolutionNote = resolutionNote?.trim() || "";

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