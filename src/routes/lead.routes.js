import express from "express";
import { protectAny } from "../middleware/employeeAuth.middleware.js";
import {
  createLead,
  updateCallStatus,
  scheduleMeeting,
  closeLead,
  getLeads,
  getDashboardStats,
  getLeadById,
  getEmployeePerformance,
  getHotlist,
  getPipeline
} from "../controllers/lead.controller.js";

const router = express.Router();

// ─────────────────────────────────────────────
// All lead routes are protected and available to
// both Admin and Employee. Role-based restrictions
// are handled inside the controllers.
// ─────────────────────────────────────────────
router.use(protectAny);

// Analytics & Dashboard
router.get("/dashboard", getDashboardStats);
router.get("/performance/:employeeId", getEmployeePerformance);

// Lead Management
router.post("/create-lead", createLead);
router.get("/get-leads", getLeads);
router.get("/get-lead/:id", getLeadById);

// Pipeline & Lists
router.get("/hotlist", getHotlist);
router.get("/pipeline", getPipeline);
router.patch("/:id/update-lead", updateCallStatus);
router.post("/:id/meeting", scheduleMeeting);
router.patch("/:id/close", closeLead);

export default router;
