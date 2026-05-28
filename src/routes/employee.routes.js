import express from "express";
import protect from "../middleware/auth.middleware.js";
import protectEmployee, { protectAny } from "../middleware/employeeAuth.middleware.js";
import { uploadDocuments } from "../middleware/upload.middleware.js";
import {
  registerEmployee,
  loginEmployee,
  logoutEmployee,
  getEmployeeProfile,
  getEmployeeById,
  getAllEmployees,
  getDocumentFile,
} from "../controllers/employee.controller.js";

const router = express.Router();

// ---------------------------------------------------------
// Public Routes
// ---------------------------------------------------------

// Register Employee (Admin Only)
// POST -> /api/v1/employee/register
router.post("/register", protect, uploadDocuments, registerEmployee);

// Login Employee
// POST -> /api/v1/employee/login
router.post("/login", loginEmployee);

// ---------------------------------------------------------
// Employee-Authenticated Routes
// ---------------------------------------------------------

// Get Own Profile
// GET -> /api/v1/employee/profile
router.get("/profile", protectEmployee, getEmployeeProfile);

// Logout Employee
// POST -> /api/v1/employee/logout
router.post("/logout", protectEmployee, logoutEmployee);

// Fetch Document File (Admin or Employee)
// GET -> /api/v1/employee/document/:id
router.get("/document/:id", protectAny, getDocumentFile);

// ---------------------------------------------------------
// Admin-Authenticated Routes
// ---------------------------------------------------------


// Get All Employees (Admin Only)
// GET -> /api/v1/employee/all
router.get("/all", protect, getAllEmployees);

// Get Single Employee by ID (Admin Only)
// GET -> /api/v1/employee/:id
router.get("/:id", protect, getEmployeeById);

export default router;
