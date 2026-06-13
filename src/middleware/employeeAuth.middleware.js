import jwt from "jsonwebtoken";
import EmployeeModel from "../models/employee.model.js";

// --------------------------------------------------------------
// protectEmployee  —  Authenticates Employee via JWT cookie
// Attaches `req.employee` for downstream handlers
// --------------------------------------------------------------

const protectEmployee = async (req, res, next) => {
  try {
    // ---------------------------------------------
    // Get Token From Cookie
    // ---------------------------------------------
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not Authorized — No Token Provided",
      });
    }

    // ----------------------------------------------
    // Verify Token
    // ----------------------------------------------
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ----------------------------------------------
    // Find Employee (not Admin)
    // ----------------------------------------------
    const employee = await EmployeeModel.findById(decoded.id).select(
      "-password"
    );

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: "Not Authorized — Employee Not Found",
      });
    }

    if (!employee.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account Deactivated — Contact Admin",
      });
    }

    req.employee = employee;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or Expired Token",
    });
  }
};

export default protectEmployee;

export const protectAny = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not Authorized — No Token Provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try finding employee first
    const employee = await EmployeeModel.findById(decoded.id).select("-password");
    if (employee) {
      if (!employee.isActive) {
        return res.status(403).json({
          success: false,
          message: "Account Deactivated — Contact Admin",
        });
      }
      req.employee = employee;
      return next();
    }

    // Try finding admin
    const { default: AdminModel } = await import("../models/admin.model.js");
    const admin = await AdminModel.findById(decoded.id).select("-password");
    if (admin) {
      req.admin = admin;
      return next();
    }

    return res.status(401).json({
      success: false,
      message: "Not Authorized",
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or Expired Token",
    });
  }
};
