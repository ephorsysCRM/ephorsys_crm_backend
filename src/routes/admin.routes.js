import express from "express";
import {
  getAdminProfile,
  loginAdmin,
  LogoutAdmin,
  registerAdmin,
} from "../controllers/admin.controller.js";
import protect from "../middleware/auth.middleware.js";

const router = express.Router();

// ------------------------------------------------------
// Admin Authentication Routes
// ------------------------------------------------------

// Register Admin
// POST -> /api/v1/admin/register
router.post("/register", registerAdmin);

// Login Admin
// POST -> /api/v1/admin/login
router.post("/login", loginAdmin);

// Logout Admin
// POST -> /api/v1/admin/logout
router.post("/logout", LogoutAdmin);

// ------------------------------------------------------
// Admin Profile
// GET -> /api/v1/admin/profile
// ------------------------------------------------------
router.get("/profile", protect, getAdminProfile);



export default router;
