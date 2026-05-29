import EmployeeModel from "../models/employee.model.js";
import JobInformationModel from "../models/jobInformation.model.js";
import generateToken from "../util/generateToken.js";

// --------------------------------------------------------------
// isEmployeeMiddleware
// --------------------------------------------------------------
// Placed BEFORE loginAdmin on the /login route.
//
// Flow:
//  1. Check if `officialEmail` is provided (employee field).
//     - If only `email` is provided (admin field), skip → next()
//  2. If officialEmail IS provided, this middleware OWNS the
//     entire request — it will never call next().
//  3. Find the employee, check department, validate password,
//     and respond with employee data or an error.
// --------------------------------------------------------------

const isEmployeeMiddleware = async (req, res, next) => {
  try {
    const { officialEmail, password } = req.body;

    // ─────────────────────────────────────────
    // If officialEmail is NOT provided, this is
    // an admin login attempt → skip to loginAdmin
    // ─────────────────────────────────────────
    if (!officialEmail) {
      return next();
    }

    // ─────────────────────────────────────────
    // From this point on, officialEmail IS provided,
    // so this is an employee login attempt.
    // We handle it entirely here — no next().
    // ─────────────────────────────────────────

    // ─────────────────────────────────────────
    // Validation — password required
    // ─────────────────────────────────────────
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Official Email and Password are Required",
      });
    }

    // ─────────────────────────────────────────
    // Find Employee by officialEmail
    // ─────────────────────────────────────────
    const employee = await EmployeeModel.findOne({ officialEmail });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee Not Found",
      });
    }

    // ─────────────────────────────────────────
    // Active Account Check
    // ─────────────────────────────────────────
    if (!employee.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact Admin.",
      });
    }

    // ─────────────────────────────────────────
    // Fetch Job Information & Check Department
    // ─────────────────────────────────────────
    const jobInfo = await JobInformationModel.findOne({
      employee: employee._id,
    });

    if (!jobInfo || jobInfo.department !== "Business Development Executive") {
      return res.status(403).json({
        success: false,
        message:
          "Access Denied. Only Business Development Executive employees can login here.",
      });
    }

    // ─────────────────────────────────────────
    // Password Check
    // ─────────────────────────────────────────
    const isPasswordMatched = await employee.comparePassword(password);
    if (!isPasswordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    // ─────────────────────────────────────────
    // Generate Token & Set Cookie
    // ─────────────────────────────────────────
    const token = generateToken(employee._id);

    const cookieOption = {
      httpOnly: true,
      secure: false, // set true in production
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res.cookie("token", token, cookieOption);

    // ─────────────────────────────────────────
    // Respond with Employee Data (BDE Login)
    // ─────────────────────────────────────────
    return res.status(200).json({
      success: true,
      message: "Login Successful",
      data: {
        _id: employee._id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        officialEmail: employee.officialEmail,
        profilePhoto: employee.profilePhoto,
        department: jobInfo.department,
        designation: jobInfo.designation,
        employmentStatus: jobInfo.employmentStatus,
        role: employee.role,
      },
    });
  } catch (error) {
    console.error("isEmployeeMiddleware Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export default isEmployeeMiddleware;