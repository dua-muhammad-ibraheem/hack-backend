const Ticket = require("../models/Ticket");
const User = require("../models/User");

const generateTicketNumber = () => {
  return "TKT-" + Date.now().toString().slice(-8);
};

// =====================================================
// CREATE TICKET (customer)
// =====================================================
const createTicket = async (req, res) => {
  try {
    const { subject, description, category, assignedWorker } = req.body;

    if (!subject || !description || !category) {
      return res.status(400).json({
        message: "Subject, description and category are required",
      });
    }

    let workerId = null;

    if (assignedWorker) {
      const worker = await User.findOne({
        _id: assignedWorker,
        role: "worker",
      });

      if (!worker) {
        return res.status(400).json({
          message: "Selected worker was not found",
        });
      }

      workerId = worker._id;
    }

    const ticket = await Ticket.create({
      ticketNumber: generateTicketNumber(),
      subject: subject.trim(),
      description: description.trim(),
      category,
      customer: req.user.userId,
      assignedWorker: workerId,
      status: workerId ? "Assigned" : "New",
    });

    res.status(201).json({
      message: "Ticket created successfully",
      ticket,
    });
  } catch (error) {
    console.error("Create ticket error:", error);

    res.status(500).json({
      message: "Failed to create ticket",
      error: error.message,
    });
  }
};
// =====================================================
// GET MY TICKETS (customer)
// =====================================================
const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ customer: req.user.userId })
      .populate("assignedWorker", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ tickets });
  } catch (error) {
    console.error("Fetch my tickets error:", error);

    res.status(500).json({
      message: "Failed to fetch your tickets",
    });
  }
};

// =====================================================
// GET WORKER TICKETS (worker)
// =====================================================
const getWorkerTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ assignedWorker: req.user.userId })
      .populate("customer", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ tickets });
  } catch (error) {
    console.error("Fetch worker tickets error:", error);

    res.status(500).json({
      message: "Failed to fetch requests",
    });
  }
};

// =====================================================
// GET SINGLE TICKET (customer who owns it, assigned worker, or admin)
// =====================================================
const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("customer", "name email")
      .populate("assignedWorker", "name email")
      .populate("replies.sender", "name email role");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const userId = req.user.userId;
    const role = req.user.role;

    const isOwner = ticket.customer?._id?.toString() === userId;
    const isAssignedWorker =
      ticket.assignedWorker?._id?.toString() === userId;

    if (role !== "admin" && !isOwner && !isAssignedWorker) {
      return res.status(403).json({
        message: "You do not have access to this ticket",
      });
    }

    const ticketObj = ticket.toObject();
    ticketObj.assignedAgent = ticketObj.assignedWorker;

    res.status(200).json({ ticket: ticketObj });
  } catch (error) {
    console.error("Fetch ticket error:", error);

    res.status(500).json({
      message: "Failed to fetch ticket",
    });
  }
};

// =====================================================
// ACCEPT REQUEST — Assigned → In Progress
// =====================================================
const acceptTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      assignedWorker: req.user.userId,
    });

    if (!ticket) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (ticket.status !== "Assigned") {
      return res.status(400).json({
        message: "This request cannot be accepted",
      });
    }

    const { category, priority, summary } = req.body || {};

    if (category) ticket.category = category;
    if (priority) ticket.priority = priority;
    if (summary !== undefined) ticket.aiSummary = summary;

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
};

// =====================================================
// REJECT REQUEST — deleted permanently
// =====================================================
const rejectTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      assignedWorker: req.user.userId,
    });

    if (!ticket) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (ticket.status !== "Assigned") {
      return res.status(400).json({
        message: "Only assigned requests can be rejected",
      });
    }

    await Ticket.findByIdAndDelete(ticket._id);

    res.status(200).json({ message: "Request rejected successfully" });
  } catch (error) {
    console.error("Reject request error:", error);

    res.status(500).json({
      message: "Failed to reject request",
    });
  }
};

// =====================================================
// COMPLETE REQUEST — In Progress → Resolved
// =====================================================
const completeTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      assignedWorker: req.user.userId,
    });

    if (!ticket) {
      return res.status(404).json({ message: "Request not found" });
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
};

// =====================================================
// ADD REPLY (owning customer or assigned worker)
// =====================================================
const addReply = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Reply message is required" });
    }

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const userId = req.user.userId;

    const isOwner = ticket.customer.toString() === userId;
    const isAssignedWorker =
      ticket.assignedWorker && ticket.assignedWorker.toString() === userId;

    if (!isOwner && !isAssignedWorker) {
      return res.status(403).json({
        message: "You do not have access to this ticket",
      });
    }

    ticket.replies.push({
      sender: userId,
      message: message.trim(),
    });

    await ticket.save();

    const updated = await Ticket.findById(ticket._id).populate(
      "replies.sender",
      "name email role"
    );

    res.status(201).json({
      message: "Reply added",
      replies: updated.replies,
    });
  } catch (error) {
    console.error("Add reply error:", error);

    res.status(500).json({
      message: "Failed to send reply",
    });
  }
};

// =====================================================
// ADD REVIEW (customer, only after ticket is Resolved)
// =====================================================
const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Please provide a rating between 1 and 5",
      });
    }

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticket.customer.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Only the ticket owner can leave a review",
      });
    }

    if (ticket.status !== "Resolved") {
      return res.status(400).json({
        message: "You can only review a resolved ticket",
      });
    }

    if (ticket.rating) {
      return res.status(400).json({
        message: "This ticket has already been reviewed",
      });
    }

    ticket.rating = rating;
    ticket.reviewComment = comment ? comment.trim() : "";

    await ticket.save();

    res.status(200).json({
      message: "Review submitted",
      ticket,
    });
  } catch (error) {
    console.error("Add review error:", error);

    res.status(500).json({
      message: "Failed to submit review",
    });
  }
};

module.exports = {
  createTicket,
  getWorkers,
  getMyTickets,
  getWorkerTickets,
  getTicketById,
  acceptTicket,
  rejectTicket,
  completeTicket,
  addReply,
};