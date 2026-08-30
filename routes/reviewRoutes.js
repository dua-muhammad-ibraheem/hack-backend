const express = require("express");

const Review = require("../models/Review");
const Ticket = require("../models/Ticket");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();


// Customer submits review after completion
router.post(
  "/",
  authMiddleware,
  roleMiddleware("customer"),
  async (req, res) => {
    try {
      const { ticketId, rating, comment } = req.body;

      if (!ticketId || !rating) {
        return res.status(400).json({
          message: "Ticket and rating are required",
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          message: "Rating must be between 1 and 5",
        });
      }

      const ticket = await Ticket.findOne({
        _id: ticketId,
        customer: req.user.userId,
        status: "Completed",
      });

      if (!ticket) {
        return res.status(404).json({
          message: "Completed ticket not found",
        });
      }

      if (!ticket.assignedWorker) {
        return res.status(400).json({
          message: "No worker is assigned to this ticket",
        });
      }

      const existingReview = await Review.findOne({
        ticket: ticket._id,
      });

      if (existingReview) {
        return res.status(400).json({
          message: "You have already reviewed this request",
        });
      }

      const review = await Review.create({
        ticket: ticket._id,
        customer: req.user.userId,
        worker: ticket.assignedWorker,
        rating,
        comment: comment?.trim() || "",
      });

      res.status(201).json({
        message: "Review submitted successfully",
        review,
      });
    } catch (error) {
      console.error("Review error:", error);

      res.status(500).json({
        message: "Failed to submit review",
      });
    }
  }
);

module.exports = router;