import express from "express";
import adminRoutes from "../routes/admin.routes.js";
const router = express.Router();

// ========================================
// Admin Routes
// ========================================
router.use("/admin", adminRoutes);

export default router;
