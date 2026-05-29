import express from "express";
import {
  getAdminProfile,
  loginAdmin,
  LogoutAdmin,
  registerAdmin,
} from "../controllers/admin.controller.js";
import protect from "../middleware/auth.middleware.js";
import isEmployeeMiddleware from "../middleware/isEmployee.middleware.js";

const router = express.Router();

// ------------------------------------------------------
// Admin Authentication Routes
// ------------------------------------------------------

// Register Admin
// POST -> /api/v1/admin/register
router.post("/register", registerAdmin);

// Login Admin or BDE Employee
// POST -> /api/v1/admin/login
// Middleware checks if the user is a BDE employee first;
// if not, falls through to loginAdmin.
router.post("/login", isEmployeeMiddleware, loginAdmin);

// Logout Admin
// POST -> /api/v1/admin/logout
router.post("/logout", LogoutAdmin);

// ------------------------------------------------------
// Admin Profile
// GET -> /api/v1/admin/profile
// ------------------------------------------------------
router.get("/profile", protect, getAdminProfile);



export default router;
