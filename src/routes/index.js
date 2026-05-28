import express from "express";
import adminRoutes from "../routes/admin.routes.js";
import employeeRoutes from "./employee.routes.js";

const router = express.Router();

// ========================================
// Admin Routes
// ========================================
router.use("/admin", adminRoutes);

// ----------------------------------------
// Employee Routes
// ----------------------------------------
router.use("/employee", employeeRoutes);

export default router;
