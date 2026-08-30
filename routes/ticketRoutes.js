const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  createTicket,
  getWorkers,
  getMyTickets,
  getWorkerTickets,
  getTicketById,
  acceptTicket,
  rejectTicket,
  completeTicket,
  addReply,
} = require("../controllers/ticketController");

const router = express.Router();

// Specific routes first (before /:id) so they aren't swallowed by it

router.post("/", authMiddleware, roleMiddleware("customer"), createTicket);

router.get("/workers", authMiddleware, roleMiddleware("customer"), getWorkers);

router.get("/my", authMiddleware, roleMiddleware("customer"), getMyTickets);

router.get("/worker", authMiddleware, roleMiddleware("worker"), getWorkerTickets);

router.patch("/:id/accept", authMiddleware, roleMiddleware("worker"), acceptTicket);

router.delete("/:id/reject", authMiddleware, roleMiddleware("worker"), rejectTicket);

router.patch("/:id/complete", authMiddleware, roleMiddleware("worker"), completeTicket);

router.post("/:id/replies", authMiddleware, addReply);

router.get("/:id", authMiddleware, getTicketById);

module.exports = router;