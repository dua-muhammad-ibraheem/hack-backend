const mongoose = require("mongoose");

const replySchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      required: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
    },

    category: {
      type: String,
      enum: ["Billing", "Account", "Technical", "Orders", "General"],
      required: true,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    // AI-generated (or worker-edited) short summary of the issue
    aiSummary: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["New", "Assigned", "In Progress", "Resolved"],
      default: "New",
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    resolutionNote: {
      type: String,
      default: "",
      trim: true,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    reviewComment: {
      type: String,
      default: "",
      trim: true,
    },

    replies: [replySchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Ticket", ticketSchema);